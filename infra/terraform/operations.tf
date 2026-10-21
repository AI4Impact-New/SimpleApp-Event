# Operational alarms use existing service metrics. Add SNS subscribers explicitly
# after the recipient confirms; the default sends no email or external messages.
resource "aws_sns_topic" "operations" {
  name = "${var.project_name}-operations"
}
resource "aws_sns_topic_policy" "operations" {
  arn = aws_sns_topic.operations.arn
  policy = jsonencode({ Version = "2012-10-17", Statement = [{
    Sid       = "CloudWatchProjectAlarms", Effect = "Allow", Principal = { Service = "cloudwatch.amazonaws.com" },
    Action    = "sns:Publish", Resource = aws_sns_topic.operations.arn,
    Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }, ArnLike = { "aws:SourceArn" = "arn:aws:cloudwatch:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alarm:${var.project_name}-*" } }
    }, {
    Sid       = "SESTransactionalFeedback", Effect = "Allow", Principal = { Service = "ses.amazonaws.com" },
    Action    = "sns:Publish", Resource = aws_sns_topic.operations.arn,
    Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }, ArnEquals = { "aws:SourceArn" = aws_sesv2_configuration_set.transactional.arn } }
  }] })
}
locals {
  monitored_functions = toset(["events", "attendance", "polls", "materials", "analytics", "users", "courses", "cognito-post-confirm", "learning", "notifications"])
}
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each            = local.monitored_functions
  alarm_name          = "${var.project_name}-${each.value}-errors"
  alarm_description   = "Inspect the function logs and release runbook; sustained execution errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = "${var.project_name}-${each.value}" }
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 3
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]
  ok_actions          = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_metric_alarm" "learning_throttles" {
  alarm_name          = "${var.project_name}-learning-throttles"
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  dimensions          = { FunctionName = aws_lambda_function.learning.function_name }
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 3
  evaluation_periods  = 2
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${var.project_name}-api-server-errors"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  dimensions          = { ApiId = aws_apigatewayv2_api.main.id }
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 5
  evaluation_periods  = 2
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_metric_alarm" "database" {
  for_each = {
    cpu     = { metric = "CPUUtilization", comparison = "GreaterThanThreshold", threshold = 80 }
    storage = { metric = "FreeStorageSpace", comparison = "LessThanThreshold", threshold = 2147483648 }
    memory  = { metric = "FreeableMemory", comparison = "LessThanThreshold", threshold = 67108864 }
  }
  alarm_name          = "${var.project_name}-database-${each.key}"
  namespace           = "AWS/RDS"
  metric_name         = each.value.metric
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  comparison_operator = each.value.comparison
  threshold           = each.value.threshold
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  period              = 300
  statistic           = "Average"
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_metric_alarm" "notification_schedule" {
  alarm_name          = "${var.project_name}-notification-schedule-failures"
  namespace           = "AWS/Events"
  metric_name         = "FailedInvocations"
  dimensions          = { RuleName = aws_cloudwatch_event_rule.notifications.name }
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  evaluation_periods  = 1
  period              = 300
  statistic           = "Sum"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.operations.arn]
}
resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = "${var.project_name}-operations"
  dashboard_body = jsonencode({ widgets = [
    { type = "metric", x = 0, y = 0, width = 12, height = 6, properties = { title = "HTTP API requests and failures", region = var.aws_region, period = 300, stat = "Sum", metrics = [["AWS/ApiGateway", "Count", "ApiId", aws_apigatewayv2_api.main.id], ["AWS/ApiGateway", "5xx", "ApiId", aws_apigatewayv2_api.main.id], ["AWS/ApiGateway", "4xx", "ApiId", aws_apigatewayv2_api.main.id]] } },
    { type = "metric", x = 12, y = 0, width = 12, height = 6, properties = { title = "Function errors", region = var.aws_region, period = 300, stat = "Sum", metrics = [for name in sort(tolist(local.monitored_functions)) : ["AWS/Lambda", "Errors", "FunctionName", "${var.project_name}-${name}"]] } },
    { type = "metric", x = 0, y = 6, width = 12, height = 6, properties = { title = "Database CPU and connections", region = var.aws_region, period = 300, stat = "Average", metrics = [["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.identifier], ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.identifier]] } },
    { type = "metric", x = 12, y = 6, width = 12, height = 6, properties = { title = "Database free memory and storage", region = var.aws_region, period = 300, stat = "Average", metrics = [["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", aws_db_instance.main.identifier], ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", aws_db_instance.main.identifier]] } }
  ] })
}
output "operations_sns_topic_arn" { value = aws_sns_topic.operations.arn }
output "operations_dashboard_url" { value = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards/dashboard/${aws_cloudwatch_dashboard.operations.dashboard_name}" }

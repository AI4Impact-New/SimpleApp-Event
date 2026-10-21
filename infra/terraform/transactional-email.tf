# Transactional delivery remains feature-gated until SES verifies the identity
# and grants production access. These controls apply when delivery is enabled.
resource "aws_sesv2_account_suppression_attributes" "transactional" {
  suppressed_reasons = ["BOUNCE", "COMPLAINT"]
}
resource "aws_sesv2_configuration_set" "transactional" {
  configuration_set_name = "${var.project_name}-transactional"
  reputation_options {
    reputation_metrics_enabled = true
  }
  suppression_options {
    suppressed_reasons = ["BOUNCE", "COMPLAINT"]
  }
}
resource "aws_sesv2_configuration_set_event_destination" "transactional_feedback" {
  configuration_set_name = aws_sesv2_configuration_set.transactional.configuration_set_name
  event_destination_name = "operations-feedback"
  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE", "COMPLAINT", "REJECT", "RENDERING_FAILURE"]
    sns_destination {
      topic_arn = aws_sns_topic.operations.arn
    }
  }
  depends_on = [aws_sns_topic_policy.operations]
}

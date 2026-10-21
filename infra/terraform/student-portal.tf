# Student web edition of the shared Expo app. Static artifacts are deployed with
# scripts/deploy_student_portal.py; no repository token is stored in Terraform.
resource "aws_amplify_app" "student_portal" {
  name     = "AI4Impact Student Portal"
  platform = "WEB"
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json|webp)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }
  custom_headers = <<-HEADERS
    customHeaders:
      - pattern: '**'
        headers:
          - key: X-Content-Type-Options
            value: nosniff
          - key: Referrer-Policy
            value: strict-origin-when-cross-origin
  HEADERS
  # Amplify reads this YAML back as a normalized JSON array.
  lifecycle {
    ignore_changes = [custom_headers]
  }
}
resource "aws_amplify_branch" "student_portal_main" {
  app_id            = aws_amplify_app.student_portal.id
  branch_name       = "main"
  framework         = "React"
  stage             = "PRODUCTION"
  enable_auto_build = false
}
output "student_portal_url" {
  value = "https://main.${aws_amplify_app.student_portal.default_domain}"
}
output "student_portal_amplify_app_id" {
  value = aws_amplify_app.student_portal.id
}

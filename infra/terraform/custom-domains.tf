# DNS is authoritative at GoDaddy. Publish the records output below there;
# creating a Route 53 zone would not update the live domain.
resource "aws_amplify_domain_association" "admin" {
  app_id                 = aws_amplify_app.admin.id
  domain_name            = "admin.ai4impact.in"
  enable_auto_sub_domain = false
  wait_for_verification  = false
  sub_domain {
    branch_name = "main"
    prefix      = ""
  }
}

resource "aws_sesv2_email_identity" "transactional" {
  email_identity = "ai4impact.in"
}

output "admin_domain_dns" {
  value = {
    certificate = aws_amplify_domain_association.admin.certificate_verification_dns_record
    routing     = aws_amplify_domain_association.admin.sub_domain
  }
}
output "email_domain_dkim_dns" {
  value = [for token in aws_sesv2_email_identity.transactional.dkim_signing_attributes[0].tokens : {
    name  = "${token}._domainkey.ai4impact.in"
    type  = "CNAME"
    value = "${token}.dkim.amazonses.com"
  }]
}

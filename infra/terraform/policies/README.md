# Learning execution permissions

Baseline generated with IAM Policy Autopilot 0.3.0:

```bash
uvx iam-policy-autopilot@latest generate-policies /absolute/path/to/SimpleApp-Event/lambdas/learning/media.py --region ap-south-1 --account 767491588787 --service-hints s3 secretsmanager --tf-dir /absolute/path/to/SimpleApp-Event/infra/terraform --pretty
```

The baseline is narrowed to GetObject/PutObject on this account's dedicated video and certificate objects and GetSecretValue on its video-signer secret. Object Lambda, access points, ACLs, legal-hold operations, and KMS permissions are omitted: this component does not use those features and uses SSE-S3 encryption. Logs and ENI access are supplied by AWSLambdaVPCAccessExecutionRole. Terraform attaches this policy to the separate learning execution role.

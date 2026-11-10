# Deploy Commands (SimpleApp-Event)

Run from repo root unless noted.

## 1) Build Lambda zip packages

```bash
cd ~/Coder/PayIntelli/SimpleApp-Event
bash scripts/build_lambdas.sh
```

## 2) Deploy Lambda code directly (fast update)

```bash
for fn in events attendance polls materials analytics; do
  aws lambda update-function-code \
    --function-name "payintelli-$fn" \
    --zip-file "fileb://lambdas/$fn.zip" \
    --profile jm \
    --region ap-south-1
done
```

## 3) Verify Lambda update timestamps

```bash
for fn in events attendance polls materials analytics; do
  aws lambda get-function-configuration \
    --function-name "payintelli-$fn" \
    --profile jm \
    --region ap-south-1 \
    --query '{FunctionName:FunctionName,LastModified:LastModified}' \
    --output table
done
```

## 4) Terraform plan/apply

```bash
cd ~/Coder/PayIntelli/SimpleApp-Event/infra/terraform
chmod +x run_terraform.sh
./run_terraform.sh init
./run_terraform.sh plan
./run_terraform.sh apply
```

## 5) Create Cognito groups (one-time)

```bash
cd ~/Coder/PayIntelli/SimpleApp-Event
USER_POOL_ID=$(cd infra/terraform && ./run_terraform.sh output -raw cognito_user_pool_id)
AWS_PROFILE=jm AWS_REGION=ap-south-1 ./scripts/create_cognito_groups.sh "$USER_POOL_ID"
```

## 6) Add an admin user to `Admins`

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id ap-south-1_6SDlpRoIV \
  --username siddartha.yadav@payintelli.com \
  --group-name Admins \
  --profile jm \
  --region ap-south-1
```

## 7) Tail logs for debugging

```bash
aws logs tail /aws/lambda/payintelli-events --since 10m --profile jm --region ap-south-1 --format short
```


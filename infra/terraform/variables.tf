# Variables for PayIntelli Academy infrastructure

variable "aws_profile" {
  description = "AWS CLI profile name for authentication (e.g. aws --profile jm)"
  type        = string
  default     = "jm"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "payintelli"
}

# Database variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "payintelli"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "payintelli_admin"
}

# Cognito variables
variable "cognito_pool_name" {
  description = "Cognito User Pool name"
  type        = string
  default     = "payintelli-users"
}

variable "cognito_client_name" {
  description = "Cognito App Client name"
  type        = string
  default     = "payintelli-app"
}

variable "cognito_domain" {
  description = "Cognito hosted UI domain (must be unique in account/region). Leave empty to use project_name-account_id."
  type        = string
  default     = ""
}

# S3 variables
variable "materials_bucket_name" {
  description = "S3 bucket name for materials"
  type        = string
  default     = "payintelli-materials"
}

# Lambda variables
variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "python_runtime" {
  description = "Lambda Python runtime"
  type        = string
  default     = "python3.12"
}

variable "lambda_build_trigger" {
  description = "Change this value to force Lambda packages to be rebuilt (e.g. after editing Lambda or shared code)"
  type        = string
  default     = "1"
}

# VPC variables (for RDS in private subnet)
variable "vpc_id" {
  description = "VPC ID for Lambda functions"
  type        = string
  default     = "" # Set in terraform.tfvars
}

variable "private_subnet_1_id" {
  description = "Private subnet 1 ID"
  type        = string
  default     = "" # Set in terraform.tfvars
}

variable "private_subnet_2_id" {
  description = "Private subnet 2 ID"
  type        = string
  default     = "" # Set in terraform.tfvars
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

# Set to true to allow direct connection to RDS from the internet (e.g. TablePlus). Requires public_subnet_* to be set.
variable "db_publicly_accessible" {
  description = "Whether RDS is publicly accessible (for dev; use bastion in production)"
  type        = bool
  default     = true
}

variable "public_subnet_1_id" {
  description = "Public subnet 1 ID (required for db_publicly_accessible; RDS must be in a subnet with IGW route)"
  type        = string
  default     = ""
}

variable "public_subnet_2_id" {
  description = "Public subnet 2 ID (required for db_publicly_accessible)"
  type        = string
  default     = ""
}

# Database password (use secretsmanager in production)
variable "db_password" {
  description = "Database master password. Must be 8+ chars; only printable ASCII allowed except /, @, \", and space (RDS constraint)."
  type        = string
  sensitive   = true
  default     = "" # Set in terraform.tfvars

  validation {
    condition     = var.db_password == "" || (length(var.db_password) >= 8 && can(regex("^[^/@\" ]+$", var.db_password)))
    error_message = "db_password must be at least 8 characters and cannot contain /, @, \", or space (RDS requirement)."
  }
}

variable "expo_project_id" {
  description = "App team's EAS project UUID. Native push registration is disabled until configured."
  type        = string
  default     = ""
}
variable "expo_push_access_token" {
  description = "Optional Expo enhanced-push-security access token; provide through local secret variables."
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_custom_origins" {
  description = "Approved HTTPS origins for admin/student Cognito login after domain attachment"
  type        = list(string)
  default     = ["https://admin.ai4impact.in"]
  validation {
    condition     = alltrue([for origin in var.admin_custom_origins : can(regex("^https://[a-zA-Z0-9.-]+$", origin))])
    error_message = "Use HTTPS origins only, without a path or trailing slash."
  }
}

variable "transactional_email_enabled" {
  description = "Enable Resend quote emails only after sender verification, API key setup and delivery testing"
  type        = bool
  default     = false
}

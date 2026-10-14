# Terraform configuration for PayIntelli Academy backend

terraform {
  required_version = ">= 1.10"

  required_providers {
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "pilearn-terraform-state-767491588787"
    key          = "pilearn/production/terraform.tfstate"
    region       = "ap-south-1"
    profile      = "jm"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  allowed_account_ids = ["767491588787"]
  region              = var.aws_region
  profile             = var.aws_profile

  default_tags {
    tags = {
      Project     = "PayIntelli Academy"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

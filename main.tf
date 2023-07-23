# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      hashicorp-learn = "lambda-api-gateway"
    }
  }

}

resource "random_pet" "lambda_bucket_name" {
  prefix = "tg-bot-timezone-aws-terraform"
  length = 4
}

resource "null_resource" "lambda_dependencies" {
  provisioner "local-exec" {
    command = "cd ${path.module}/tg-bot-timezone && npm install"
  }

  triggers = {
    package = sha256(file("${path.module}/tg-bot-timezone/package.json"))
    lock = sha256(file("${path.module}/tg-bot-timezone/package-lock.json"))
  }
}

locals {
  lambda_dependency_id = "${null_resource.lambda_dependencies.id}"
  source_dir           = "${path.module}/tg-bot-timezone"
}

data "archive_file" "lambda_tg_bot" {
  type = "zip"

  source_dir  = "${local.source_dir}"
  output_path = "${path.module}/tg-bot-timezone.zip"
}


resource "aws_lambda_function" "tg_bot" {
  function_name = "TelegramBotTimezone"
  filename  = "tg-bot-timezone.zip"
  runtime = "nodejs18.x"
  handler = "tgbot.handler"

  source_code_hash = data.archive_file.lambda_tg_bot.output_base64sha256

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      tg_bot_token = var.tg_bot_token
    }
  }
}

resource "aws_lambda_function_url" "tg_bot" {
    function_name      = aws_lambda_function.tg_bot.function_name
    authorization_type = "NONE"
}

resource "aws_cloudwatch_log_group" "tg_bot" {
  name = "/aws/lambda/${aws_lambda_function.tg_bot.function_name}"

  retention_in_days = 30
}

resource "aws_iam_role" "lambda_exec" {
  name = "serverless_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      }
    ]
  })
}

resource "aws_iam_policy" "dynamoDBLambdaPolicy" {
  name = "DynamoDBLambdaPolicy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Scan"
        ]
        Resource = [
          var.dynamodb_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  for_each = toset([
    aws_iam_policy.dynamoDBLambdaPolicy.arn,
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ])
  role       = aws_iam_role.lambda_exec.name
  policy_arn = each.value
}
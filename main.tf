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

resource "aws_s3_bucket" "lambda_bucket" {
  bucket = random_pet.lambda_bucket_name.id
}

resource "aws_s3_bucket_ownership_controls" "lambda_bucket_ownership" {
  bucket = aws_s3_bucket.lambda_bucket.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "bucket_acl" {
  depends_on = [ aws_s3_bucket_ownership_controls.lambda_bucket_ownership ]
  bucket = aws_s3_bucket.lambda_bucket.id
  acl    = "private"
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

resource "aws_s3_object" "lambda_tg_bot" {
  bucket = aws_s3_bucket.lambda_bucket.id

  key    = "tg-bot-timezone.zip"
  source = data.archive_file.lambda_tg_bot.output_path

  etag = filemd5(data.archive_file.lambda_tg_bot.output_path)
}

resource "aws_lambda_function" "tg_bot" {
  function_name = "TelegramBotTimezone"

  s3_bucket = aws_s3_bucket.lambda_bucket.id
  s3_key    = aws_s3_object.lambda_tg_bot.key

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

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# resource "aws_apigatewayv2_api" "lambda" {
#   name          = "serverless_lambda_gw"
#   protocol_type = "HTTP"
# }

# resource "aws_apigatewayv2_stage" "lambda" {
#   api_id = aws_apigatewayv2_api.lambda.id

#   name        = "serverless_lambda_stage"
#   auto_deploy = true

#   access_log_settings {
#     destination_arn = aws_cloudwatch_log_group.api_gw.arn

#     format = jsonencode({
#       requestId               = "$context.requestId"
#       sourceIp                = "$context.identity.sourceIp"
#       requestTime             = "$context.requestTime"
#       protocol                = "$context.protocol"
#       httpMethod              = "$context.httpMethod"
#       resourcePath            = "$context.resourcePath"
#       routeKey                = "$context.routeKey"
#       status                  = "$context.status"
#       responseLength          = "$context.responseLength"
#       integrationErrorMessage = "$context.integrationErrorMessage"
#       }
#     )
#   }
# }

# resource "aws_apigatewayv2_integration" "tg_bot" {
#   api_id = aws_apigatewayv2_api.lambda.id

#   integration_uri    = aws_lambda_function.tg_bot.invoke_arn
#   integration_type   = "AWS_PROXY"
#   integration_method = "POST"
# }

# resource "aws_apigatewayv2_route" "tg_bot" {
#   api_id = aws_apigatewayv2_api.lambda.id

#   route_key = "POST /"
#   target    = "integrations/${aws_apigatewayv2_integration.tg_bot.id}"
# }

# resource "aws_cloudwatch_log_group" "api_gw" {
#   name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

#   retention_in_days = 30
# }

# resource "aws_lambda_permission" "api_gw" {
#   statement_id  = "AllowExecutionFromAPIGateway"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.tg_bot.function_name
#   principal     = "apigateway.amazonaws.com"

#   source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
# }

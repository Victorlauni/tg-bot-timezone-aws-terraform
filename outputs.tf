# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

# Output value definitions

output "function_name" {
  description = "Name of the Lambda function."

  value = aws_lambda_function.tg_bot.function_name
}

output "base_url" {
  description = "Base URL for API Gateway stage."

  value = aws_lambda_function_url.tg_bot.function_url
}
# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

# Input variable definitions

variable "aws_region" {
  description = "AWS region for all resources."

  type    = string
  default = "us-east-1"
}

variable "dynamodb_arn" {
  description = "arn for dynamodb"

  type    = string
  default = "arn:aws:dynamodb:us-east-1:823276892724:table/tg_timezone"
}
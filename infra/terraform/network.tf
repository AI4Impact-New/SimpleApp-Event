# Private application subnets with outbound internet for Cognito/JWKS.
resource "aws_subnet" "private" {
  for_each                = { a = { az = "ap-south-1a", cidr = "172.31.64.0/24" }, b = { az = "ap-south-1b", cidr = "172.31.65.0/24" } }
  vpc_id                  = var.vpc_id
  availability_zone       = each.value.az
  cidr_block              = each.value.cidr
  map_public_ip_on_launch = false
  tags                    = { Name = "${var.project_name}-private-${each.key}" }
}
resource "aws_eip" "nat" { domain = "vpc" }
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = "subnet-028ba4c1a9ac181e2"
  tags          = { Name = "${var.project_name}-nat" }
}
resource "aws_route_table" "private" {
  vpc_id = var.vpc_id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = { Name = "${var.project_name}-private" }
}
resource "aws_route_table_association" "private" {
  for_each       = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}

"""Private media upload, CloudFront delivery, and certificate rendering."""
import io
import os
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from urllib.parse import quote

import boto3
from botocore.config import Config
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

from learning.validation import ApiError

CONFIG = Config(connect_timeout=3, read_timeout=8, retries={"total_max_attempts": 2, "mode": "standard"})
REGION = os.environ.get("AWS_REGION", "ap-south-1")
# Regional endpoint avoids redirecting a signed URL after a newly created bucket upload.
s3 = boto3.client("s3", region_name=REGION, endpoint_url=f"https://s3.{REGION}.amazonaws.com",
                  config=CONFIG.merge(Config(signature_version="s3v4", s3={"addressing_style": "virtual"})))
secrets = boto3.client("secretsmanager", config=CONFIG)


def upload_form(key, size):
    return s3.generate_presigned_post(
        Bucket=os.environ["VIDEO_BUCKET"], Key=key,
        Fields={"Content-Type": "video/mp4"},
        Conditions=[{"Content-Type": "video/mp4"}, ["content-length-range", size, size]],
        ExpiresIn=900,
    )


def confirm_upload(key, size):
    try:
        obj = s3.head_object(Bucket=os.environ["VIDEO_BUCKET"], Key=key)
    except s3.exceptions.ClientError as error:
        if error.response["Error"]["Code"] in ("403", "404", "NoSuchKey", "NotFound"):
            raise ApiError(409, "Upload the MP4 before publishing this lecture")
        raise
    if obj["ContentLength"] != size or obj.get("ContentType") != "video/mp4":
        raise ApiError(409, "Uploaded file size or content type does not match the lecture")


@lru_cache(maxsize=4)
def _signer(key_id, secret_arn, cache_window):
    pem = secrets.get_secret_value(SecretId=secret_arn)["SecretString"].encode()
    private_key = serialization.load_pem_private_key(pem, password=None)
    return CloudFrontSigner(key_id, lambda message: private_key.sign(message, padding.PKCS1v15(), hashes.SHA1()))


def playback_url(key):
    now = datetime.now(timezone.utc)
    signer = _signer(os.environ["VIDEO_KEY_ID"], os.environ["VIDEO_SIGNER_SECRET_ARN"], int(now.timestamp() // 600))
    url = "https://" + os.environ["VIDEO_DOMAIN"] + "/" + quote(key, safe="/")
    return signer.generate_presigned_url(url, date_less_than=now + timedelta(hours=1))


def certificate_pdf(name, course, provider, certificate_id, issued_at):
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=landscape(A4))
    width, height = landscape(A4)
    pdf.setTitle(f"Certificate of completion — {course}")
    pdf.setAuthor(provider)
    pdf.setFillColor(colors.HexColor("#f8fafc"))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setStrokeColor(colors.HexColor("#2563eb"))
    pdf.setLineWidth(2)
    pdf.rect(28, 28, width - 56, height - 56)
    pdf.setFillColor(colors.HexColor("#1e40af"))
    pdf.setFont("Helvetica-Bold", 15)
    pdf.drawCentredString(width / 2, height - 85, provider)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont("Helvetica-Bold", 30)
    pdf.drawCentredString(width / 2, height - 140, "Certificate of Completion")
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 187, "This certifies that")
    pdf.setFont("Helvetica-Bold", 26)
    while pdf.stringWidth(name, "Helvetica-Bold", pdf._fontsize) > width - 160 and pdf._fontsize > 12:
        pdf.setFont("Helvetica-Bold", pdf._fontsize - 1)
    pdf.drawCentredString(width / 2, height - 235, name)
    pdf.setFont("Helvetica", 14)
    pdf.drawCentredString(width / 2, height - 277, "has successfully completed")
    pdf.setFont("Helvetica-Bold", 19)
    while pdf.stringWidth(course, "Helvetica-Bold", pdf._fontsize) > width - 160 and pdf._fontsize > 10:
        pdf.setFont("Helvetica-Bold", pdf._fontsize - 1)
    pdf.drawCentredString(width / 2, height - 318, course)
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(width / 2, 145, "Issued " + issued_at.strftime("%d %B %Y"))
    pdf.drawCentredString(width / 2, 122, "Certificate ID: " + certificate_id)
    verify = os.environ["CERTIFICATE_VERIFY_BASE_URL"].rstrip("/") + "/certificates/" + certificate_id + "/verify"
    qr = QrCodeWidget(verify)
    bounds = qr.getBounds()
    drawing = Drawing(65, 65, transform=[65 / (bounds[2] - bounds[0]), 0, 0, 65 / (bounds[3] - bounds[1]), 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, width - 110, 62)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(58, 70, "Verify this certificate by scanning the QR code.")
    pdf.showPage()
    pdf.save()
    return output.getvalue()


def store_certificate(key, contents):
    s3.put_object(Bucket=os.environ["CERTIFICATE_BUCKET"], Key=key, Body=contents, ContentType="application/pdf", ServerSideEncryption="AES256")


def certificate_download(key):
    return s3.generate_presigned_url("get_object", Params={"Bucket": os.environ["CERTIFICATE_BUCKET"], "Key": key,
                                     "ResponseContentDisposition": 'attachment; filename="certificate.pdf"'}, ExpiresIn=300)

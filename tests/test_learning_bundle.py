"""The sender must ship payment/PDF modules, not just the API handler."""
import io
from zipfile import ZipFile
import pytest
from scripts.verify_learning_bundle import verify_bundle,REQUIRED


def bundle(files):
    stream=io.BytesIO()
    with ZipFile(stream,'w') as archive:
        for name in files:archive.writestr(name,b'QA')
    stream.seek(0);return stream


def test_prior_worker_missing_payment_module_is_rejected():
    with pytest.raises(ValueError,match='learning/payments.py'):
        verify_bundle(bundle([name for name in REQUIRED if name!='learning/payments.py']))


def test_complete_payment_pdf_bundle_is_accepted():
    assert verify_bundle(bundle(REQUIRED))==len(REQUIRED)

import qrcode
import io
from flask import Flask, render_template_string, send_file

app = Flask(__name__)

# Link yang akan disamarkan
domain_alias = "082139695033"
original_url = "https://www.youtube.com/"

# Generate QR Code saat server dijalankan
def generate_qr():
    qr = qrcode.QRCode(box_size=10, border=5)
    qr.add_data(domain_alias)  # Gunakan domain samaran
    qr.make(fit=True)
    img = qr.make_image(fill="black", back_color="white")

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)
    return img_bytes

@app.route("/")
def redirect_to_google_form():
    return render_template_string("""
        <html>
            <body>
                <h2>Scan QR Code untuk mengakses formulir</h2>
                <img src="/qr" alt="QR Code">
                <form id="redirectForm" action="{{ url }}" method="POST">
                    <input type="hidden" name="redirect" value="1">
                </form>
                <script>
                    document.getElementById("redirectForm").submit();
                </script>
            </body>
        </html>
    """, url=original_url)

@app.route("/qr")
def qr_code():
    return send_file(generate_qr(), mimetype="image/png")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

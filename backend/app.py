from flask import Flask, jsonify
from flask_cors import CORS

from models.chamado import criar_tabela
from routes.chamados import chamados_bp

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    },
    methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ],
    allow_headers=[
        "Content-Type"
    ]
)

criar_tabela()

app.register_blueprint(chamados_bp)


@app.route("/")
def inicio():
    return jsonify({
        "sistema": "Sistema de Chamados",
        "status": "online"
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
from flask import Blueprint, request, jsonify
from database.connection import conectar_banco
from datetime import datetime, timezone, timedelta


chamados_bp = Blueprint(
    "chamados",
    __name__,
    url_prefix="/api/chamados"
)


# =========================================================
# HORÁRIO DO BRASIL - RECIFE / BRASÍLIA
# UTC-3
# =========================================================

FUSO_BRASIL = timezone(timedelta(hours=-3))


def agora_brasil():
    """
    Retorna a data e hora atual no horário de Recife/Brasília.
    """
    return datetime.now(FUSO_BRASIL)


# =========================================================
# ATUALIZAR STATUS DOS CHAMADOS
# =========================================================

def atualizar_status():

    conexao = conectar_banco()

    if conexao is None:
        return

    cursor = conexao.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                id,
                data_abertura
            FROM chamados
            WHERE status = 'ABERTO'
        """)

        chamados = cursor.fetchall()

        hoje = agora_brasil().date()

        for chamado in chamados:

            data_abertura = chamado["data_abertura"]

            if isinstance(data_abertura, datetime):
                data_abertura = data_abertura.date()

            if data_abertura is None:
                continue

            diferenca = hoje - data_abertura

            if diferenca.days >= 1:

                cursor.execute("""
                    UPDATE chamados
                    SET status = 'PENDENTE'
                    WHERE id = %s
                    AND status = 'ABERTO'
                """, (
                    chamado["id"],
                ))

        conexao.commit()

    except Exception as erro:

        print(
            "Erro ao atualizar status:",
            erro
        )

        conexao.rollback()

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# CRIAR CHAMADO
# =========================================================

@chamados_bp.route(
    "",
    methods=["POST"]
)
def criar_chamado():

    dados = request.get_json()

    if not dados:
        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    campos_obrigatorios = [
        "funcionario",
        "servico",
        "solicitante",
        "setor",
        "unidade",
        "andar",
        "predio"
    ]

    for campo in campos_obrigatorios:

        valor = dados.get(campo)

        if valor is None or str(valor).strip() == "":

            return jsonify({
                "erro": f"O campo '{campo}' é obrigatório."
            }), 400

    # =====================================================
    # HORA DO BRASIL
    # =====================================================

    agora = agora_brasil()

    data_abertura = agora.strftime(
        "%Y-%m-%d"
    )

    hora_abertura = agora.strftime(
        "%H:%M:%S"
    )

    print("========================================")
    print("NOVO CHAMADO")
    print("HORARIO UTC:")
    print(
        datetime.now(
            timezone.utc
        ).strftime("%Y-%m-%d %H:%M:%S")
    )
    print("HORARIO BRASIL:")
    print(
        agora.strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    )
    print("DATA GRAVADA:")
    print(data_abertura)
    print("HORA GRAVADA:")
    print(hora_abertura)
    print("========================================")

    numero_chamado = dados.get(
        "numero_chamado"
    )

    usuario = dados.get(
        "usuario"
    )

    if numero_chamado == "":
        numero_chamado = None

    if usuario == "":
        usuario = None

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco de dados."
        }), 500

    cursor = conexao.cursor()

    try:

        # =================================================
        # VERIFICAR NÚMERO DO CHAMADO
        # =================================================

        if numero_chamado is not None:

            try:

                numero_chamado = int(
                    numero_chamado
                )

            except (ValueError, TypeError):

                return jsonify({
                    "erro": "O número do chamado deve ser numérico."
                }), 400

            if numero_chamado <= 0:

                return jsonify({
                    "erro": "O número do chamado deve ser maior que zero."
                }), 400

            cursor.execute("""
                SELECT id
                FROM chamados
                WHERE numero_chamado = %s
            """, (
                numero_chamado,
            ))

            existente = cursor.fetchone()

            if existente:

                return jsonify({
                    "erro": "Este número de chamado já está cadastrado."
                }), 409

        # =================================================
        # INSERIR CHAMADO
        # =================================================

        sql = """
            INSERT INTO chamados (
                numero_chamado,
                usuario,
                funcionario,
                data_abertura,
                horario_abertura,
                servico,
                solicitante,
                setor,
                unidade,
                andar,
                predio,
                observacao,
                status
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'ABERTO'
            )
        """

        valores = (
            numero_chamado,
            usuario,
            dados["funcionario"].strip(),
            data_abertura,
            hora_abertura,
            dados["servico"].strip(),
            dados["solicitante"].strip(),
            dados["setor"].strip(),
            dados["unidade"].strip(),
            dados["andar"].strip(),
            dados["predio"].strip(),
            dados.get(
                "observacao",
                ""
            ).strip()
        )

        cursor.execute(
            sql,
            valores
        )

        conexao.commit()

        novo_id = cursor.lastrowid

        return jsonify({
            "mensagem": "Chamado criado com sucesso!",
            "id": novo_id,
            "numero_chamado": numero_chamado,
            "status": "ABERTO",
            "data_abertura": data_abertura,
            "horario_abertura": hora_abertura
        }), 201

    except Exception as erro:

        conexao.rollback()

        print(
            "Erro ao criar chamado:",
            erro
        )

        return jsonify({
            "erro": str(erro)
        }), 500

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# LISTAR CHAMADOS
# =========================================================

@chamados_bp.route(
    "",
    methods=["GET"]
)
def listar_chamados():

    # Atualiza automaticamente os chamados abertos
    # há pelo menos 1 dia.
    atualizar_status()

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco de dados."
        }), 500

    cursor = conexao.cursor(
        dictionary=True
    )

    try:

        cursor.execute("""
            SELECT
                id,
                numero_chamado,
                usuario,
                funcionario,

                DATE_FORMAT(
                    data_abertura,
                    '%d/%m/%Y'
                ) AS data_abertura,

                TIME_FORMAT(
                    horario_abertura,
                    '%H:%i'
                ) AS horario_abertura,

                servico,
                solicitante,
                setor,
                unidade,
                andar,
                predio,
                observacao,
                status,
                data_conclusao

            FROM chamados

            ORDER BY id DESC
        """)

        chamados = cursor.fetchall()

        # Converter data_conclusao para texto
        # sem fazer conversão automática de fuso.
        for chamado in chamados:

            if chamado.get(
                "data_conclusao"
            ) is not None:

                data_conclusao = chamado[
                    "data_conclusao"
                ]

                if isinstance(
                    data_conclusao,
                    datetime
                ):

                    chamado[
                        "data_conclusao"
                    ] = data_conclusao.strftime(
                        "%d/%m/%Y %H:%M:%S"
                    )

        return jsonify(
            chamados
        ), 200

    except Exception as erro:

        print(
            "Erro ao listar chamados:",
            erro
        )

        return jsonify({
            "erro": str(erro)
        }), 500

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# EDITAR CHAMADO
# =========================================================

@chamados_bp.route(
    "/<int:id>",
    methods=["PUT"]
)
def editar_chamado(id):

    dados = request.get_json()

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    campos_obrigatorios = [
        "funcionario",
        "servico",
        "solicitante",
        "setor",
        "unidade",
        "andar",
        "predio"
    ]

    for campo in campos_obrigatorios:

        valor = dados.get(campo)

        if valor is None or str(valor).strip() == "":

            return jsonify({
                "erro": f"O campo '{campo}' é obrigatório."
            }), 400

    numero_chamado = dados.get(
        "numero_chamado"
    )

    usuario = dados.get(
        "usuario"
    )

    if numero_chamado == "":
        numero_chamado = None

    if usuario == "":
        usuario = None

    if numero_chamado is not None:

        try:

            numero_chamado = int(
                numero_chamado
            )

        except (ValueError, TypeError):

            return jsonify({
                "erro": "O número do chamado deve ser numérico."
            }), 400

        if numero_chamado <= 0:

            return jsonify({
                "erro": "O número do chamado deve ser maior que zero."
            }), 400

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco de dados."
        }), 500

    cursor = conexao.cursor()

    try:

        # =============================================
        # VERIFICAR SE O CHAMADO EXISTE
        # =============================================

        cursor.execute("""
            SELECT id
            FROM chamados
            WHERE id = %s
        """, (
            id,
        ))

        chamado = cursor.fetchone()

        if not chamado:

            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404

        # =============================================
        # VERIFICAR DUPLICIDADE DO NÚMERO
        # =============================================

        if numero_chamado is not None:

            cursor.execute("""
                SELECT id
                FROM chamados
                WHERE numero_chamado = %s
                AND id <> %s
            """, (
                numero_chamado,
                id
            ))

            existente = cursor.fetchone()

            if existente:

                return jsonify({
                    "erro": "Este número de chamado já está sendo usado."
                }), 409

        # =============================================
        # ATUALIZAR
        # =============================================

        cursor.execute("""
            UPDATE chamados

            SET
                numero_chamado = %s,
                usuario = %s,
                funcionario = %s,
                servico = %s,
                solicitante = %s,
                setor = %s,
                unidade = %s,
                andar = %s,
                predio = %s,
                observacao = %s

            WHERE id = %s
        """, (
            numero_chamado,
            usuario,
            dados["funcionario"].strip(),
            dados["servico"].strip(),
            dados["solicitante"].strip(),
            dados["setor"].strip(),
            dados["unidade"].strip(),
            dados["andar"].strip(),
            dados["predio"].strip(),
            dados.get(
                "observacao",
                ""
            ).strip(),
            id
        ))

        conexao.commit()

        return jsonify({
            "mensagem": "Chamado alterado com sucesso!"
        }), 200

    except Exception as erro:

        conexao.rollback()

        print(
            "Erro ao editar chamado:",
            erro
        )

        return jsonify({
            "erro": str(erro)
        }), 500

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# ATUALIZAR SOMENTE O NÚMERO DO CHAMADO
# =========================================================

@chamados_bp.route(
    "/<int:id>/numero",
    methods=["PUT"]
)
def atualizar_numero_chamado(id):

    dados = request.get_json()

    if not dados:

        return jsonify({
            "erro": "Nenhum dado foi enviado."
        }), 400

    numero_chamado = dados.get(
        "numero_chamado"
    )

    if numero_chamado in (
        None,
        ""
    ):

        return jsonify({
            "erro": "Informe o número do chamado."
        }), 400

    try:

        numero_chamado = int(
            numero_chamado
        )

    except (ValueError, TypeError):

        return jsonify({
            "erro": "O número do chamado deve ser numérico."
        }), 400

    if numero_chamado <= 0:

        return jsonify({
            "erro": "O número do chamado deve ser maior que zero."
        }), 400

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco de dados."
        }), 500

    cursor = conexao.cursor()

    try:

        # Verifica se existe
        cursor.execute("""
            SELECT id
            FROM chamados
            WHERE id = %s
        """, (
            id,
        ))

        chamado = cursor.fetchone()

        if not chamado:

            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404

        # Verifica duplicidade
        cursor.execute("""
            SELECT id
            FROM chamados
            WHERE numero_chamado = %s
            AND id <> %s
        """, (
            numero_chamado,
            id
        ))

        existente = cursor.fetchone()

        if existente:

            return jsonify({
                "erro": "Este número de chamado já está sendo usado."
            }), 409

        cursor.execute("""
            UPDATE chamados

            SET numero_chamado = %s

            WHERE id = %s
        """, (
            numero_chamado,
            id
        ))

        conexao.commit()

        return jsonify({
            "mensagem": "Número do chamado atualizado com sucesso!"
        }), 200

    except Exception as erro:

        conexao.rollback()

        print(
            "Erro ao atualizar número:",
            erro
        )

        return jsonify({
            "erro": str(erro)
        }), 500

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# CONCLUIR CHAMADO
# =========================================================

@chamados_bp.route(
    "/<int:id>/concluir",
    methods=["PUT"]
)
def concluir_chamado(id):

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco de dados."
        }), 500

    cursor = conexao.cursor()

    try:

        # =============================================
        # VERIFICAR EXISTÊNCIA
        # =============================================

        cursor.execute("""
            SELECT
                id,
                status
            FROM chamados
            WHERE id = %s
        """, (
            id,
        ))

        chamado = cursor.fetchone()

        if not chamado:

            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404

        # =============================================
        # HORÁRIO BRASIL
        # =============================================

        agora = agora_brasil()

        data_conclusao = agora.strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        print("========================================")
        print("CONCLUSÃO DE CHAMADO")
        print("HORARIO BRASIL:")
        print(data_conclusao)
        print("========================================")

        cursor.execute("""
            UPDATE chamados

            SET
                status = 'CONCLUÍDO',
                data_conclusao = %s

            WHERE id = %s
        """, (
            data_conclusao,
            id
        ))

        conexao.commit()

        return jsonify({
            "mensagem": "Chamado concluído com sucesso!",
            "data_conclusao": data_conclusao
        }), 200

    except Exception as erro:

        conexao.rollback()

        print(
            "Erro ao concluir chamado:",
            erro
        )

        return jsonify({
            "erro": str(erro)
        }), 500

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# EXCLUIR CHAMADO
# =========================================================

@chamados_bp.route(
    "/<int:id>",
    methods=["DELETE"]
)
def excluir_chamado(id):

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco de dados."
        }), 500

    cursor = conexao.cursor()

    try:

        cursor.execute("""
            SELECT id
            FROM chamados
            WHERE id = %s
        """, (
            id,
        ))

        chamado = cursor.fetchone()

        if not chamado:

            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404

        cursor.execute("""
            DELETE FROM chamados
            WHERE id = %s
        """, (
            id,
        ))

        conexao.commit()

        return jsonify({
            "mensagem": "Chamado excluído com sucesso!"
        }), 200

    except Exception as erro:

        conexao.rollback()

        print(
            "Erro ao excluir chamado:",
            erro
        )

        return jsonify({
            "erro": str(erro)
        }), 500

    finally:

        cursor.close()
        conexao.close()
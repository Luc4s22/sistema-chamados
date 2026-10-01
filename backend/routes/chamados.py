from flask import Blueprint, request, jsonify
from database.connection import conectar_banco
from datetime import datetime
from zoneinfo import ZoneInfo


chamados_bp = Blueprint(
    "chamados",
    __name__,
    url_prefix="/api/chamados"
)


# =========================================================
# FUSO HORÁRIO DO SISTEMA
# =========================================================

FUSO_BRASILIA = ZoneInfo("America/Sao_Paulo")


def agora_brasilia():
    """
    Retorna data e hora atuais no horário de Brasília.
    """
    return datetime.now(FUSO_BRASILIA)


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
            SELECT id, data_abertura
            FROM chamados
            WHERE status = 'ABERTO'
        """)

        chamados = cursor.fetchall()

        hoje = agora_brasilia().date()

        for chamado in chamados:

            data_abertura = chamado["data_abertura"]

            diferenca = hoje - data_abertura

            if diferenca.days >= 1:

                cursor.execute("""
                    UPDATE chamados
                    SET status = 'PENDENTE'
                    WHERE id = %s
                """, (
                    chamado["id"],
                ))

        conexao.commit()

    except Exception as erro:

        conexao.rollback()

        print(
            "Erro ao atualizar status:",
            erro
        )

    finally:

        cursor.close()
        conexao.close()


# =========================================================
# CRIAR CHAMADO
# =========================================================

@chamados_bp.route("", methods=["POST"])
def criar_chamado():

    dados = request.get_json(
        silent=True
    ) or {}


    # -----------------------------------------------------
    # CAMPOS OBRIGATÓRIOS
    # -----------------------------------------------------

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
                "erro": f"O campo {campo} é obrigatório."
            }), 400


    # -----------------------------------------------------
    # NÚMERO DO CHAMADO
    # OPCIONAL
    # -----------------------------------------------------

    numero_chamado = dados.get(
        "numero_chamado"
    )


    if numero_chamado is None:

        numero_chamado = None

    elif str(numero_chamado).strip() == "":

        numero_chamado = None

    else:

        try:

            numero_chamado = int(
                numero_chamado
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "erro": "O número do chamado deve ser numérico."
            }), 400


        if numero_chamado <= 0:

            return jsonify({
                "erro": "O número do chamado deve ser maior que zero."
            }), 400


    # -----------------------------------------------------
    # USUÁRIO
    # OPCIONAL
    # -----------------------------------------------------

    usuario = dados.get(
        "usuario"
    )


    if usuario is not None:

        usuario = str(
            usuario
        ).strip()


        if usuario == "":

            usuario = None


    # -----------------------------------------------------
    # CONEXÃO COM BANCO
    # -----------------------------------------------------

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco."
        }), 500


    cursor = conexao.cursor()


    # -----------------------------------------------------
    # DATA E HORA DE BRASÍLIA
    # -----------------------------------------------------

    agora = agora_brasilia()


    # -----------------------------------------------------
    # SQL
    # -----------------------------------------------------

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

        dados["funcionario"],

        agora.date(),

        agora.time(),

        dados["servico"],

        dados["solicitante"],

        dados["setor"],

        dados["unidade"],

        dados["andar"],

        dados["predio"],

        dados.get(
            "observacao",
            ""
        )

    )


    # -----------------------------------------------------
    # INSERIR
    # -----------------------------------------------------

    try:

        cursor.execute(
            sql,
            valores
        )

        conexao.commit()


    except Exception as erro:

        conexao.rollback()

        erro_texto = str(
            erro
        )

        cursor.close()

        conexao.close()


        if "Duplicate entry" in erro_texto:

            return jsonify({
                "erro": "Esse número de chamado já está cadastrado."
            }), 409


        return jsonify({
            "erro": erro_texto
        }), 400


    cursor.close()

    conexao.close()


    return jsonify({

        "mensagem": "Chamado criado com sucesso!",

        "numero_chamado": numero_chamado,

        "status": "ABERTO"

    }), 201


# =========================================================
# LISTAR CHAMADOS
# =========================================================

@chamados_bp.route("", methods=["GET"])
def listar_chamados():

    atualizar_status()


    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco."
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


    except Exception as erro:

        cursor.close()

        conexao.close()


        return jsonify({
            "erro": str(erro)
        }), 500


    cursor.close()

    conexao.close()


    return jsonify(
        chamados
    )


# =========================================================
# EDITAR CHAMADO
# =========================================================

@chamados_bp.route(
    "/<int:id>",
    methods=["PUT"]
)
def editar_chamado(id):

    dados = request.get_json(
        silent=True
    ) or {}


    # -----------------------------------------------------
    # NÚMERO DO CHAMADO
    # OPCIONAL
    # -----------------------------------------------------

    numero_chamado = dados.get(
        "numero_chamado"
    )


    if (
        numero_chamado is None
        or str(numero_chamado).strip() == ""
    ):

        numero_chamado = None

    else:

        try:

            numero_chamado = int(
                numero_chamado
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "erro": "O número do chamado deve ser numérico."
            }), 400


        if numero_chamado <= 0:

            return jsonify({
                "erro": "O número do chamado deve ser maior que zero."
            }), 400


    # -----------------------------------------------------
    # USUÁRIO
    # OPCIONAL
    # -----------------------------------------------------

    usuario = dados.get(
        "usuario"
    )


    if usuario is not None:

        usuario = str(
            usuario
        ).strip()


        if usuario == "":

            usuario = None


    # -----------------------------------------------------
    # CAMPOS
    # -----------------------------------------------------

    funcionario = dados.get(
        "funcionario"
    )

    servico = dados.get(
        "servico"
    )

    solicitante = dados.get(
        "solicitante"
    )

    setor = dados.get(
        "setor"
    )

    unidade = dados.get(
        "unidade"
    )

    andar = dados.get(
        "andar"
    )

    predio = dados.get(
        "predio"
    )

    observacao = dados.get(
        "observacao",
        ""
    )


    # -----------------------------------------------------
    # CAMPOS OBRIGATÓRIOS
    # -----------------------------------------------------

    campos_obrigatorios = {

        "funcionario": funcionario,

        "servico": servico,

        "solicitante": solicitante,

        "setor": setor,

        "unidade": unidade,

        "andar": andar,

        "predio": predio

    }


    for campo, valor in campos_obrigatorios.items():

        if (
            valor is None
            or str(valor).strip() == ""
        ):

            return jsonify({
                "erro": f"O campo {campo} é obrigatório."
            }), 400


    # -----------------------------------------------------
    # CONEXÃO
    # -----------------------------------------------------

    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco."
        }), 500


    cursor = conexao.cursor()


    try:

        # -------------------------------------------------
        # VERIFICAR SE EXISTE
        # -------------------------------------------------

        cursor.execute("""
            SELECT id
            FROM chamados
            WHERE id = %s
        """, (
            id,
        ))


        existente = cursor.fetchone()


        if not existente:

            cursor.close()

            conexao.close()


            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404


        # -------------------------------------------------
        # VERIFICAR NÚMERO DUPLICADO
        # -------------------------------------------------

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


            duplicado = cursor.fetchone()


            if duplicado:

                cursor.close()

                conexao.close()


                return jsonify({
                    "erro": "Esse número de chamado já está sendo utilizado."
                }), 409


        # -------------------------------------------------
        # ATUALIZAR
        # -------------------------------------------------

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

            funcionario,

            servico,

            solicitante,

            setor,

            unidade,

            andar,

            predio,

            observacao,

            id

        ))


        conexao.commit()


    except Exception as erro:

        conexao.rollback()

        erro_texto = str(
            erro
        )

        cursor.close()

        conexao.close()


        if "Duplicate entry" in erro_texto:

            return jsonify({
                "erro": "Esse número de chamado já está cadastrado."
            }), 409


        return jsonify({
            "erro": erro_texto
        }), 400


    cursor.close()

    conexao.close()


    return jsonify({

        "mensagem": "Chamado alterado com sucesso!"

    })


# =========================================================
# EDITAR SOMENTE NÚMERO
# =========================================================

@chamados_bp.route(
    "/<int:id>/numero",
    methods=["PUT"]
)
def editar_numero_chamado(id):

    dados = request.get_json(
        silent=True
    ) or {}


    novo_numero = dados.get(
        "numero_chamado"
    )


    if (
        novo_numero is None
        or str(novo_numero).strip() == ""
    ):

        novo_numero = None

    else:

        try:

            novo_numero = int(
                novo_numero
            )

        except (
            ValueError,
            TypeError
        ):

            return jsonify({
                "erro": "O número do chamado deve ser numérico."
            }), 400


        if novo_numero <= 0:

            return jsonify({
                "erro": "O número do chamado deve ser maior que zero."
            }), 400


    conexao = conectar_banco()

    if conexao is None:

        return jsonify({
            "erro": "Não foi possível conectar ao banco."
        }), 500


    cursor = conexao.cursor()


    try:

        if novo_numero is not None:

            cursor.execute("""
                SELECT id
                FROM chamados
                WHERE numero_chamado = %s
                AND id <> %s
            """, (
                novo_numero,
                id
            ))


            existente = cursor.fetchone()


            if existente:

                cursor.close()

                conexao.close()


                return jsonify({
                    "erro": "Esse número de chamado já está sendo utilizado."
                }), 409


        cursor.execute("""
            UPDATE chamados

            SET numero_chamado = %s

            WHERE id = %s
        """, (
            novo_numero,
            id
        ))


        if cursor.rowcount == 0:

            conexao.rollback()

            cursor.close()

            conexao.close()


            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404


        conexao.commit()


    except Exception as erro:

        conexao.rollback()

        cursor.close()

        conexao.close()


        return jsonify({
            "erro": str(erro)
        }), 400


    cursor.close()

    conexao.close()


    return jsonify({

        "mensagem": "Número do chamado alterado com sucesso!",

        "numero_chamado": novo_numero

    })


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
            "erro": "Não foi possível conectar ao banco."
        }), 500


    cursor = conexao.cursor()


    try:

        cursor.execute("""
            DELETE FROM chamados
            WHERE id = %s
        """, (
            id,
        ))


        if cursor.rowcount == 0:

            conexao.rollback()

            cursor.close()

            conexao.close()


            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404


        conexao.commit()


    except Exception as erro:

        conexao.rollback()

        cursor.close()

        conexao.close()


        return jsonify({
            "erro": str(erro)
        }), 500


    cursor.close()

    conexao.close()


    return jsonify({

        "mensagem": "Chamado excluído com sucesso!"

    })


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
            "erro": "Não foi possível conectar ao banco."
        }), 500


    cursor = conexao.cursor()


    try:

        # -------------------------------------------------
        # PEGAR DATA/HORA DE BRASÍLIA
        # -------------------------------------------------

        agora = agora_brasilia()


        # -------------------------------------------------
        # ATUALIZAR
        # -------------------------------------------------

        cursor.execute("""
            UPDATE chamados

            SET

                status = 'CONCLUÍDO',

                data_conclusao = %s

            WHERE id = %s

        """, (
            agora.replace(
                tzinfo=None
            ),
            id
        ))


        if cursor.rowcount == 0:

            conexao.rollback()

            cursor.close()

            conexao.close()


            return jsonify({
                "erro": "Chamado não encontrado."
            }), 404


        conexao.commit()


    except Exception as erro:

        conexao.rollback()

        cursor.close()

        conexao.close()


        return jsonify({
            "erro": str(erro)
        }), 500


    cursor.close()

    conexao.close()


    return jsonify({

        "mensagem": "Chamado concluído com sucesso!"

    })

from database.connection import conectar_banco


def criar_tabela():

    conexao = conectar_banco()

    if conexao is None:
        print("Não foi possível criar a tabela.")
        return

    cursor = conexao.cursor()

    sql = """
    CREATE TABLE IF NOT EXISTS chamados (

        id INT AUTO_INCREMENT PRIMARY KEY,

        numero_chamado INT NULL UNIQUE,

        usuario VARCHAR(150) NOT NULL,

        funcionario VARCHAR(150) NOT NULL,

        data_abertura DATE NOT NULL,

        horario_abertura TIME NOT NULL,

        servico VARCHAR(255) NOT NULL,

        solicitante VARCHAR(150) NOT NULL,

        setor VARCHAR(150) NOT NULL,

        unidade VARCHAR(150) NOT NULL,

        andar VARCHAR(100) NOT NULL,

        predio VARCHAR(150) NOT NULL,

        observacao TEXT,

        status ENUM(
            'ABERTO',
            'PENDENTE',
            'CONCLUÍDO'
        ) NOT NULL DEFAULT 'ABERTO',

        data_conclusao DATETIME NULL

    )
    """

    try:

        cursor.execute(sql)

        conexao.commit()

        print(
            "Tabela 'chamados' verificada/criada com sucesso!"
        )

    except Exception as erro:

        conexao.rollback()

        print("Erro ao criar tabela:")
        print(erro)

    finally:

        cursor.close()
        conexao.close()


import os

import mysql.connector

from dotenv import load_dotenv


load_dotenv()


def conectar_banco():

    try:

        conexao = mysql.connector.connect(

            host=os.getenv(
                "MYSQL_HOST"
            ),

            port=int(
                os.getenv(
                    "MYSQL_PORT",
                    3306
                )
            ),

            database=os.getenv(
                "MYSQL_DATABASE"
            ),

            user=os.getenv(
                "MYSQL_USER"
            ),

            password=os.getenv(
                "MYSQL_PASSWORD"
            )

        )

        # =================================================
        # CONFIGURAR FUSO HORÁRIO DO MYSQL
        # =================================================

        cursor = conexao.cursor()

        cursor.execute(
            "SET time_zone = '-03:00'"
        )

        cursor.close()

        return conexao

    except mysql.connector.Error as erro:

        print(
            "Erro ao conectar ao banco:",
            erro
        )

        return None
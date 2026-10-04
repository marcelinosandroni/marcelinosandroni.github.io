# Caminho para o arquivo .env
$envFile = ".\.env"

# Ler cada linha do arquivo
Get-Content $envFile | ForEach-Object {
    # Ignorar linhas vazias ou comentários
    if ($_ -match "^\s*$" -or $_ -match "^\s*#") { return }

    # Separar chave e valor
    $parts = $_ -split "=", 2

    # Ignorar linhas sem "=" (linha avulsa ou valor truncado): sem o separador
    # $parts[1] não existe, o .Trim() estoura e o script inteiro aborta aqui,
    # deixando todas as variáveis seguintes sem valor.
    if ($parts.Length -lt 2) { return }

    $key = $parts[0].Trim()
    $value = $parts[1].Trim()

    # Remover as aspas de abertura e fechamento quando ambas existem. 17 dos 21
    # valores do .env estão entre aspas duplas, e quem consome a variável recebe
    # a string como está — com as aspas. Sem esta limpeza a URL do Postgres chega
    # como "postgres://..." e falha com erro de conexão inválida, e a chave do
    # Resend chega como "re_..." e responde 401.
    if ($value.Length -ge 2) {
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
    }

    # Definir variável de ambiente
    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
}
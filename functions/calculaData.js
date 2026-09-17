export default function calculaData(data) {
    const hoje = new Date();
    const outraData = new Date(data);

    if (Number.isNaN(outraData.getTime())) {
        return "Data informada é inválida";
    }

    const diferencaEmMilissegundos = Math.abs(
        hoje.getTime() - outraData.getTime()
    );

    const diferencaEmDias = Math.floor(
        diferencaEmMilissegundos / (1000 * 60 * 60 * 24)
    );

    return diferencaEmDias
}
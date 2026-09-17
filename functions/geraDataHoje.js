export default function geraDataHoje() {
    const data = new Date().toISOString().split('T')[0]
    return data
}

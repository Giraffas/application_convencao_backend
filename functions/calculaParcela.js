export function dividirValor(valorTotal, quantidade) {
  if (quantidade <= 0) {
    throw new Error('A quantidade deve ser maior que zero.')
  }

  return Number((valorTotal / quantidade).toFixed(2))
}
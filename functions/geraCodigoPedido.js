import { randomInt } from "node:crypto";

export default function geraCodigoPedido() {
    return randomInt(
        1_000_000_000,
        10_000_000_000
    ).toString();
}
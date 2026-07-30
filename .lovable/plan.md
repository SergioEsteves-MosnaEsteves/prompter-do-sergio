## O que acontece hoje

Confirmei em `src/components/teleprompter/useRecorder.ts` (função `buildOrientedStream`, linhas 130-141) que o tamanho da "tela" de gravação é derivado do sensor da webcam:

```
outW = menor lado do sensor
outH = maior lado do sensor
```

Ou seja, o formato final é o do sensor invertido, não 9:16. Numa webcam 16:9 dá 1080x1920 (correto por acaso), mas numa webcam 4:3 — muito comum em notebooks — dá 720x960, que é 3:4: a janela abre mais "quadrada", não no corte 9:16 pedido.

Além disso, no modo "Cabe tudo" (`contain`) a imagem entra inteira com tarjas pretas, o que também não parece um corte 9:16 real.

## O que fazer

**1. Proporção alvo fixa, independente da webcam**
- No `buildOrientedStream`, calcular o canvas a partir da proporção escolhida, não do sensor: vertical = 9:16, horizontal = 16:9.
- Dimensionar pelo lado disponível do sensor (ex.: altura 1080 → 608x1080 em 9:16; ou usar 1080x1920 quando o sensor permitir), arredondando para números pares para o codificador.

**2. Abrir a prévia já com o corte**
- Como a prévia usa o mesmo canvas da gravação, ela passa a mostrar imediatamente a moldura 9:16 assim que a câmera abre — sem precisar mexer em nada.
- Iniciar em `cover` (já é o padrão) para que o quadro apareça preenchido e recortado, e não com tarjas.

**3. Contêiner da prévia no desktop**
- Em `src/routes/index.tsx`, o contêiner já usa `aspectRatio: rec.aspect`; com o item 1 esse valor passa a ser exatamente 0.5625 no vertical, então a caixa preta lateral do desktop fica correta e centralizada.

## Detalhes técnicos

- `buildOrientedStream`: substituir `outW/outH` baseados em `short/long` por `targetRatio = orientation === "vertical" ? 9/16 : 16/9`, derivando `outH` do maior lado disponível (limitado a 1920) e `outW = round(outH * targetRatio)` (e o inverso no horizontal), com `& ~1` para paridade.
- Retornar `aspect = outW / outH` (já existe) — passa a ser 9/16 exato.
- Nenhuma mudança nas constraints do `getUserMedia`: continuamos pedindo o campo de visão mais amplo e recortando no canvas, para não reintroduzir o "zoom" do iPhone.

## Efeito colateral esperado

Em webcams 4:3, o recorte 9:16 descarta bastante das laterais — é inerente ao formato vertical. O botão "Cabe tudo" continua disponível para ver a imagem inteira dentro do quadro 9:16.

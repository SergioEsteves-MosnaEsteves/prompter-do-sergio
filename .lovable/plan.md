# Controle de velocidade durante a gravação

## No computador (funciona 100%)
Durante a tela de câmera/gravação, as setas do teclado passam a controlar o teleprompter:

- Seta direita: aumenta a velocidade em 5 px/s
- Seta esquerda: diminui a velocidade em 5 px/s
- Limites respeitados: mínimo 10, máximo 200 (os mesmos dos ajustes)
- Um indicador discreto mostra a nova velocidade por ~1 segundo ao pressionar

Extra sugerido (opcional): barra de espaço para pausar/retomar a rolagem.

## No celular: limitação real das teclas de volume
Navegadores de celular (Safari e Chrome) **não entregam** os eventos das teclas físicas de volume para páginas web — o sistema operacional captura essas teclas antes. Não existe forma suportada de fazer isso em um app web; só seria possível em um app nativo publicado nas lojas.

Alternativa proposta para o celular, com o mesmo efeito prático de ajustar sem olhar:

- Dois botões grandes "−" e "+" de velocidade na barra de gravação, fáceis de acertar com o polegar
- Deslizar o dedo na horizontal sobre a imagem da câmera durante a gravação também ajusta a velocidade (direita = mais rápido, esquerda = mais devagar), com o mesmo indicador rápido na tela

Se preferir, posso implementar só os botões, só o gesto, ou os dois.

## Detalhes técnicos
- Novo hook em `src/components/teleprompter/useSpeedShortcuts.ts` registrando `keydown` em `window`, ativo apenas no estágio `camera`, com `preventDefault` nas setas
- `src/routes/index.tsx` liga o hook ao `patch({ speed })` já existente e guarda um estado `speedHint` para o indicador
- Botões "−/+" adicionados em `src/components/teleprompter/RecorderControls.tsx` reutilizando `onChange`
- Gesto horizontal via handlers `onTouchStart/onTouchMove` no contêiner do vídeo, convertendo deslocamento em px/s
- Nenhuma mudança na gravação, no canvas ou na geração de roteiro

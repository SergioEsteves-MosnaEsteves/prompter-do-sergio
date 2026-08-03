# Controle de velocidade durante a gravação

## No computador (funciona 100%)
Durante a tela de câmera/gravação, as setas do teclado passam a controlar o teleprompter:

- Seta direita: aumenta a velocidade em 5 px/s
- Seta esquerda: diminui a velocidade em 5 px/s
- Limites respeitados: mínimo 10, máximo 200 (os mesmos dos ajustes)
- Um indicador discreto mostra a nova velocidade por ~1 segundo ao pressionar

Extra sugerido (opcional): barra de espaço para pausar/retomar a rolagem.

## No celular: botões grandes de velocidade
Navegadores de celular (Safari e Chrome) **não entregam** os eventos das teclas físicas de volume para páginas web — o sistema operacional captura essas teclas antes. Isso só seria possível em um app nativo de loja.

Solução escolhida: dois botões grandes "−" e "+" de velocidade, em local de fácil acesso durante a gravação:

- Posicionados na barra de gravação, um de cada lado do botão de gravar, na altura do polegar
- Área de toque mínima de 56px, com rótulo "Velocidade" e o valor atual entre eles
- Cada toque muda 5 px/s, respeitando os limites 10–200; segurar o botão repete o ajuste
- Mesmo indicador rápido na tela mostrando a nova velocidade

## Detalhes técnicos
- Novo hook em `src/components/teleprompter/useSpeedShortcuts.ts` registrando `keydown` em `window`, ativo apenas no estágio `camera`, com `preventDefault` nas setas
- `src/routes/index.tsx` liga o hook ao `patch({ speed })` já existente e guarda um estado `speedHint` para o indicador
- Botões "−/+" adicionados em `src/components/teleprompter/RecorderControls.tsx` reutilizando `onChange`
- Gesto horizontal via handlers `onTouchStart/onTouchMove` no contêiner do vídeo, convertendo deslocamento em px/s
- Nenhuma mudança na gravação, no canvas ou na geração de roteiro

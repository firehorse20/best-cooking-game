# Wok Rush 宵夜档

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/firehorse20/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/firehorse20/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A night-market wok station game for [make.fun's best-cooking-game-20261125-0137](https://make.fun/bounty/best-cooking-game-20261125-0137). Orders arrive on the board; you chop, toss, stir and serve before the customers walk away.

## How to play

- **看单做菜**: each order ticket shows a dish, its recipe and a countdown bar.
- **点食材下锅**: click a counter bin (or press 1–8) to drop that ingredient into the wok.
- **配方要一模一样**: when the wok holds exactly a dish's recipe, it starts cooking. A wrong mix never cooks — dump it (click the wok's DUMP button or press Del).
- **翻炒**: click the wok while it cooks to stir and finish faster.
- **上菜**: a finished dish plates itself. Click the plate (or an order ticket, or press Space) to serve it to the matching order. Fast serves earn tips; combos multiply the money.
- **别超时、别烧糊**: an order that expires or a dish left to burn costs a life. Three lives, then the stall closes.

## The menu

| 菜 | 配方 | 价 | 炒制 |
| --- | --- | --- | --- |
| 炒饭 Fried Rice | 米饭 + 鸡蛋 + 青菜 | $10 | 4s |
| 煎饺 Pan Dumplings | 饺子 + 青菜 + 辣椒 | $12 | 5s |
| 汤面 Noodle Soup | 面条 + 鸡蛋 + 虾仁 | $12 | 5s |
| 虾仁饭 Shrimp Rice | 米饭 + 虾仁 + 酱油 | $14 | 4s |
| 麻辣烫 Spicy Hotpot | 面条 + 辣椒 + 酱油 | $13 | 6s |

Orders come faster and wait less long as the night rushes on (a level every 40 seconds, up to level 8).

## Controls

- Mouse: click bins to add ingredients, click the wok to stir, click the plate or a ticket to serve, click DUMP to clear the wok.
- Keyboard: 1–8 ingredients, Space serve, Del dump, P pause, Enter/Space start and restart.

## Run it

Serve `game/` locally (`node serve.ts`, then http://localhost:8080) or hand it in with `node main.ts`, which copies `game/` and `screenshots/` to `/output` and writes `dossier.json`. Plain canvas, no libraries, no network requests. The four screenshots in `screenshots/` are real renders of the game's own `?shot=` scenes: the title kitchen, a dish mid-cook, a plate ready to serve, and the end of a shift.

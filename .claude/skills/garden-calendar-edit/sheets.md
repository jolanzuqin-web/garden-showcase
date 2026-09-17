# Листы `garden-data.xlsx`

Столбцы ниже — те, что реально читает `docs/build/build-from-xlsx.js`.
Списки в ячейках — через запятую (`growMethod`, `plants`, `regions`).

## `Calendar` — записи рекомендаций (одна строка = одна карточка)

| Столбец | Смысл |
|---|---|
| `region` | id региона (см. лист `Regions`): `srednyaya-polosa`, `yug`, `ural-sibir`, `severo-zapad` |
| `month` | номер месяца (1–12) |
| `monthName` | название месяца прописью |
| `workType` | id типа работ (см. `Worktypes`) |
| `category` | категория/рубрика внутри типа работ |
| `growMethod` | способ выращивания, список (напр. `открытый грунт, теплица`) |
| `plants` | культуры, список id (см. `Plants`) |
| `text` | текст рекомендации (первая буква авто-капитализируется при сборке) |
| `detail` | необязательный расширенный блок «Препараты и процесс» |
| `source` | трассируемость правки (URL/название). **В JSON сайта не попадает.** |

## `Plants` — культуры

`id`, `name`, `category`, `group` (необяз.), `hasSeedlingStage` (`да` / пусто),
`regions` (список id регионов), `icon` (имя файла без расширения из
`docs/icons/plants/`, fallback `sprout`).

## `Worktypes` — типы работ

`id`, `name`, `icon`, `order` (порядок вывода).

## `Regions` — регионы

`id`, `name`, `status` (`ready` и т.п.).

## `Notes` — примечания

`title`, `text`, `workType` (к какому типу работ относится).

---

Точные значения и полный список строк — открывать сам `garden-data.xlsx`
(или смотреть свежие `docs/data/*.json` как срез после последней сборки).

# Шаблоны отдельных услуг ВЕРХ

Предпросмотр находится в ветке `feature/service-pages` и закрыт от индексации через `noindex, nofollow`. Основной сайт не изменён.

## Страницы

- укладка ламината;
- поклейка обоев;
- шпаклёвка стен;
- укладка плитки;
- разводка труб и сантехники;
- монтаж натяжного потолка.

Во всех формах установлен фильтр минимального заказа: одна комната, полноценная зона или комплексный этап. Мелкие бытовые выезды не обещаются.

## Черновые цены

Цены нужны только для предпросмотра и требуют подтверждения Игоря и Юрия до рекламного запуска.

| Услуга | Цена в шаблоне | Открытый ориентир по Краснодару |
| --- | ---: | --- |
| Укладка ламината | от 350 ₽/м² | Proffi Floor — от 364 ₽/м²; Laminarium — от 400 ₽/м² |
| Поклейка обоев | от 180 ₽/м² | Profi.ru — от 200 ₽/м² |
| Шпаклёвка стен | от 240 ₽/м² | Trade Services — от 245 ₽/м² в два слоя |
| Укладка плитки | от 990 ₽/м² | Profi.ru — от 1 200 ₽/м² |
| Разводка сантехники | от 1 500 ₽/точка | Profi.ru — от 2 100 ₽ за услугу/узел; погонные работы от 200 ₽/м |
| Натяжной потолок | от 390 ₽/м² | Profi.ru — от 440 ₽/м² |

Источники проверены 3 августа 2026 года:

- <https://krasnodar.proffi-floor.ru/ukladka-laminata>
- <https://www.laminarium.com/services/ukladka-laminata-s-garantiey-ot-magazina/>
- <https://profi.ru/geo-ksdr/remont/oboi/pokleika-oboev/price/>
- <https://krasnodar.trade-services.ru/services/otdelochnye-raboty/>
- <https://profi.ru/geo-ksdr/remont/professionalnaya-ukladka-plitki/price/>
- <https://profi.ru/geo-ksdr/remont/razvodka_trub_vodosnabzhenija_v_kvartire/price/>
- <https://profi.ru/geo-ksdr/remont/kanalizaciya/price/>
- <https://profi.ru/geo-ksdr/remont/potolki/montazh-natyazhnyh-potolkov/price/>

## Заявки

На опубликованном домене форма использует существующую Yandex Cloud Function. На `localhost` отправка имитируется и не создаёт тестовую заявку в общем чате.

Для пересборки HTML после изменения `service-data.json`:

```sh
node services-preview/generate.mjs
```

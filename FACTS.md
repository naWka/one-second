# FACTS.md — проверка фактов для сайта «Одна секунда платежа»

Дата проверки: **9 октября 2026**. Все ссылки открывались в этот день.

**Уровни уверенности**
- **высокая** — первичный источник (стандарт, регулятор, официальный документ Visa/Mastercard/EMVCo, документация эквайера), значение прочитано в самом документе;
- **средняя** — вторичный источник (производитель чипов, пресс-релиз, отраслевое СМИ), или первичный документ не удалось открыть, и значение взято из его выдержки.

**О цитатах.** Дословные цитаты на английском приводятся только из текстов, которые можно свободно воспроизводить: законодательство ЕС (EUR-Lex) и документы Федеральной резервной системы США. Для остальных источников (Visa, Mastercard, EMVCo, ISO, Stripe, Adyen, Apple и др.) в поле «Цитата» стоит **пересказ** с точным указанием раздела или страницы. Так соблюдаются авторские права, а формулировку легко найти и проверить.

---

## Факты

### 1. Несущая частота NFC и бесконтактных карт — 13,56 МГц
- **Утверждение:** бесконтактные платёжные карты (ISO/IEC 14443) и NFC работают на частоте 13,56 МГц.
- **Значение:** 13,56 МГц.
- **Источник:** [ECMA-352 (3rd ed.) = ISO/IEC 21481, NFCIP-2](https://www.ecma-international.org/wp-content/uploads/ECMA-352_3rd_edition_june_2013.pdf); [NFC Forum — NFC Technology](https://nfc-forum.org/learn/nfc-technology/); карточка стандарта [ISO/IEC 14443-2:2020](https://www.iso.org/standard/73597.html).
- **Дата источника:** ECMA-352 — июнь 2013; ISO/IEC 14443-2:2020 — 4-е издание, 2020-07; страница NFC Forum без даты (открыта 2026-10-09).
- **Уверенность:** высокая.
- **Цитата:** пересказ — во введении ECMA-352 сказано, что ECMA-340, ISO/IEC 14443 и ISO/IEC 15693 задают 13,56 МГц как рабочую частоту. На странице NFC Forum: NFC работает по радио с базовой частотой 13,56 МГц. Текст самого ISO/IEC 14443-2 платный, проверить его напрямую не удалось.

### 2. Рабочее расстояние бесконтактной оплаты (~4 см)
- **Утверждение:** карта должна быть в нескольких сантиметрах от терминала. Зона, в которой EMV проверяет терминалы («operating volume»), доходит до 4 см над антенной.
- **Значение:** EMV тестирует считыватели на высоте 0–4 см над центром контактлесс-символа. Visa для потребителей пишет «в пределах 1–2 дюймов» (≈2,5–5 см). NFC Forum называет типичную дальность NFC «до 2 см».
- **Источник:** [ams AS3911 EMVCo reference design, Application note](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/12/AS3911_EMVCO.pdf) (производитель чипов-считывателей; описывает operating volume EMVCo); [Visa USA — Contactless payments FAQ](https://usa.visa.com/pay-with-visa/contactless-payments/contactless-payments.html); [NFC Forum — NFC Technology](https://nfc-forum.org/learn/nfc-technology/). Сама спецификация EMVCo (EMV Contactless Interface Specification v4.0, январь 2026; ранее Book D) закрыта регистрацией, поэтому не открывалась.
- **Дата источника:** AS3911 app note — Rev 0V6, апрель 2012; страницы Visa и NFC Forum без даты (открыты 2026-10-09).
- **Уверенность:** средняя (по EMV 4 см подтверждено вторичным источником; потребительские 1–2 дюйма — первичный источник Visa).
- **Цитата:** пересказ — в AS3911 app note (с. 7) сказано, что operating volume EMVCo проверяется в 25 позициях, часть из них на радиусе 1,5 см и на высотах «zero and 4 cm». Visa USA: для начала оплаты карта должна быть в пределах 1–2 дюймов от контактлесс-символа.
- **Примечание:** на сайте лучше писать «работает только вплотную, в паре сантиметров: стандарт EMV проверяет терминалы на расстоянии до 4 см».

### 3. В карте нет батарейки — её питает поле терминала
- **Утверждение:** бесконтактная карта пассивна. Энергию и связь ей даёт радиочастотное поле считывателя.
- **Значение:** да. Интерфейс по ISO/IEC 14443 одновременно передаёт питание и данные в обе стороны.
- **Источник:** [ISO/IEC 14443-2:2020, предпросмотр (Introduction и Scope)](https://assets.vde-verlag.de/iec-normen/preview-pdf/info_isoiec14443-2%7Bed4.0%7Den.pdf); [карточка ISO/IEC 14443-2:2020](https://www.iso.org/standard/73597.html); [NFC Forum — NFC Technology](https://nfc-forum.org/learn/nfc-technology/).
- **Дата источника:** 2020-07 (ISO/IEC 14443-2, 4-е издание).
- **Уверенность:** высокая.
- **Цитата:** пересказ — по Introduction ISO/IEC 14443-2 интерфейс между картой и считывателем «включает и питание, и двунаправленную связь». Scope: стандарт задаёт характеристики полей для питания и связи между PCD (считывателем) и PICC (картой). NFC Forum прямо упоминает режимы работы без батареи (battery-less).

### 4. Сколько длится обмен «карта ↔ терминал»
- **Утверждение:** бесконтактное чтение карты укладывается в ~0,5 с.
- **Значение:** требование Visa (спецификация VCPS): **меньше 500 мс** от первого ответа карты при Discovery Processing до шага Card Read Complete. Сюда **не входит** онлайн-авторизация. Mastercard, по пресс-релизу Infineon, требует от самой карты обработки быстрее 300 мс (Application Note #7). Документ Mastercard не открывался.
- **Источник:** [Visa Transaction Acceptance Device Guide (TADG) v3.3, §2.11 Transaction Speed](https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide.pdf); более подробная формулировка — [TADG v3.1, §2.13](https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide-tadg.pdf); [Infineon, пресс-релиз 2015](https://www.infineon.com/cms/en/about-infineon/press/market-news/2015/INFCCS201511-009.html).
- **Дата источника:** TADG v3.3 — август 2025; TADG v3.1 — ноябрь 2016; Infineon — ноябрь 2015.
- **Уверенность:** высокая (Visa, 500 мс); средняя (Mastercard, 300 мс).
- **Цитата:** пересказ — TADG v3.3 §2.11: VCPS требует, чтобы бесконтактное чтение карты занимало меньше 500 мс. TADG v3.1 §2.13 уточняет: отсчёт идёт от первого ответа карты в Discovery Processing до Card Read Complete, время онлайн-авторизации не учитывается.

### 5. Сигнал «можно убирать карту» звучит ДО онлайн-авторизации
- **Утверждение:** писк или огоньки «карта прочитана» означают конец разговора карты и терминала. Банк-эмитент к этому моменту ещё не получил запрос.
- **Значение:** подтверждено. В процессе Visa qVSDC считыватель сначала сообщает, что карту можно убрать, а потом отправляет транзакцию эквайеру. Если убрать карту до Card Read Complete, данные отбрасываются.
- **Источник:** [Visa TADG v3.3, §5.2.8 Online Processing и §5.5 Premature Card Removal](https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide.pdf); то же в [TADG v3.1, §4.6.8](https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide-tadg.pdf). В EMV Contactless Book A есть разделы UI «Card Read Successfully» (видно по оглавлению v2.6), но текст спецификации закрыт регистрацией и не проверялся.
- **Дата источника:** август 2025 (v3.3); ноябрь 2016 (v3.1).
- **Уверенность:** высокая.
- **Цитата:** пересказ — TADG v3.3 §5.2.8, первый пункт «Processing»: считыватель показывает держателю, что карту можно убрать из поля. Следующий пункт: считыватель отправляет транзакцию эквайеру. Затем эквайер передаёт её в VisaNet и эмитенту.
- **Примечание:** не все бесконтактные покупки уходят онлайн (бывают офлайн-одобрения ниже лимита), но для сценария сайта онлайн-путь — норма.

### 6. Криптограмма ARQC и токены в кошельках
- **Утверждение:** чип формирует одноразовую криптограмму ARQC (Authorization Request Cryptogram) секретным ключом, который хранится в карте. Терминал добавляет в вычисление случайное «непредсказуемое число» (Unpredictable Number). В Apple Pay и Google Pay вместо номера карты используется токен (номер устройства).
- **Значение:**
  - EMVCo: чип с помощью криптографии генерирует одноразовый код (криптограмму) для каждой транзакции. Код уникален и не может использоваться повторно.
  - Visa TADG: ARQC — криптограмма для онлайн-авторизации. Бесконтактная карта запрашивает у считывателя сумму, TTQ и **Unpredictable Number** считывателя.
  - Криптограмма — это MAC на симметричном ключе, общем у карты и банка-эмитента. Терминал проверить её не может, проверяет эмитент (или Visa от его имени).
  - Apple Pay: эмитент создаёт для устройства Device Account Number и шифрует его. Номер хранится в Secure Element. Настоящий номер карты не передаётся. К каждой оплате прикладывается динамический код, уникальный для транзакции.
  - Google Wallet: создаёт для устройства «virtual account number» (device token). Реальный номер карты не хранится на телефоне и не передаётся продавцу.
  - EMVCo: платёжный токен EMV заменяет номер карты (PAN) уникальным альтернативным значением.
- **Источник:** [EMVCo — EMV Contact Chip (FAQ)](https://www.emvco.com/emv-technologies/emv-contact-chip/); [Visa TADG v3.3, §4.10 и §5.2.4](https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide.pdf); [Bond, Choudary, Murdoch, Skorobogatov, Anderson — «Be Prepared: The EMV Pre-play Attack», Univ. of Cambridge](https://murdoch.is/papers/ieeesp15beprepared.pdf); [Apple — Apple Pay security and privacy overview](https://support.apple.com/en-us/101554); [Google — How device tokens keep your payment cards safe](https://blog.google/products/google-pay/device-tokens-google-wallet/); [EMVCo — Payment Tokenisation](https://www.emvco.com/emv-technologies/payment-tokenisation/).
- **Дата источника:** EMVCo — страница 2026 (без даты); TADG — август 2025; Bond et al. — IEEE Security & Privacy, 2015; Apple — опубликовано 27.04.2026; Google — 27.06.2024.
- **Уверенность:** высокая.
- **Цитата:** пересказ — EMVCo FAQ: EMV-чип генерирует одноразовый защитный код (криптограмму) для каждой транзакции, код уникален и не переиспользуется. Bond et al., раздел II: чип аутентифицирует данные транзакции MAC-кодом на симметричном ключе, общем у карты и банка-эмитента. Apple: Secure Element передаёт терминалу Device Account Number и динамический код, уникальный для транзакции.
- **Примечание:** спецификации EMV Book 2 (ARQC) закрыты регистрацией EMVCo. Механизм подтверждён Visa TADG и рецензируемой статьёй Кембриджа.

### 7. ISO 8583: год, MTI 0100/0110, код 39 = «00»
- **Утверждение:** терминал и эквайер «упаковывают» покупку в сообщение по ISO 8583. Запрос авторизации — MTI 0100, ответ — 0110, поле 39 (код ответа) «00» = одобрено.
- **Значение:**
  - Первая версия — **ISO 8583:1987**, опубликована **13.08.1987** («Bank card originated messages — Interchange message specifications»). Затем вышли версии 1993, 2003 (части 1–3) и действующая **ISO 8583:2023** (3-е изд., 18.07.2023). В 2026 году стандарту **39 лет**.
  - MTI: **0100 = Authorization Request, 0110 = Authorization Response**.
  - DE 39 (Response Code): **00 = Approved or completed successfully**.
- **Источник:** [ISO 8583:1987](https://www.iso.org/standard/15870.html); [ISO 8583:2023](https://www.iso.org/standard/79451.html); [NIBSS POS Interface Specifications (ISO 8583-1987) — External Message Type](https://testdocs.nibss-plc.com.ng/pos/pos-interface-specifications-iso-8583-1987-version/external-message-type.md) (межбанковский процессинг Нигерии, полная спецификация открыта); [NIBSS — DE39](https://testdocs.nibss-plc.com.ng/pos/pos-interface-specifications-iso-8583-1987-version/data-element-definition-de39-de48); [Mastercard Developers — Network Response Codes (DE 39)](https://developer.mastercard.com/mastercard-send-person-to-person/documentation/response-error-codes/network-response-codes/).
- **Дата источника:** ISO 8583:1987 — 1987-08-13; ISO 8583:2023 — 2023-07-18; NIBSS и Mastercard Developers — без даты (открыты 2026-10-09).
- **Уверенность:** высокая.
- **Цитата:** пересказ — карточка ISO: ISO 8583:1987, опубликован 1987-08-13, отозван 1993-12-23 при выходе новой редакции. NIBSS: «Authorization | 0100 & 0110 | Authorization Request & Authorization Response». Mastercard: код ответа передаётся в DE 39, «00» — одобрено.
- **Примечание:** сами таблицы ISO 8583 платные, а по ISO 8583:2023 значения полей ведёт Maintenance Agency. Конкретные сети используют свои диалекты (у Visa — V.I.P., у Mastercard — CIS), но 0100/0110 и «00» общие.

### 8. BIN/IIN: с 6 на 8 цифр
- **Утверждение:** первые цифры номера карты (BIN/IIN) указывают эмитента. ISO перешёл с 6 на 8 цифр.
- **Значение:** новая длина IIN — 8 цифр, введена в **ISO/IEC 7812-1:2017** (5-е изд., опубликовано 03.01.2017; Visa: «ISO анонсировала новый стандарт в 2017»). Visa и Mastercard: эквайеры и процессинги обязаны поддерживать 8-значные BIN **с апреля 2022** (Worldline называет дату 1 апреля 2022). После апреля 2022 Visa выдаёт только 8-значные BIN, 6-значные продолжают существовать. Длина номера карты (16 цифр) не изменилась.
- **Источник:** [ISO/IEC 7812-1:2017](https://www.iso.org/standard/70484.html); [Visa — Preparing for Eight-Digit BINs (Service Provider sheet)](https://www.visa.fr/content/dam/VCOM/global/partner-with-us/documents/service-provider-action-sheet.pdf); [Visa — Preparing for the Eight-Digit BIN, FAQ](https://usa.visa.com/dam/VCOM/global/partner-with-us/documents/visa.com-numerics-faq.pdf); [Worldline — Introduction of 8-digit BIN](https://worldline.com/en-lu/home/top-navigation/media-relations/press-release/introduction-of-8-digit-bin).
- **Дата источника:** ISO — 2017-01 (подтверждён в 2022); Visa FAQ — январь 2020; Worldline — опубликовано 02.12.2022 (текст в будущем времени).
- **Уверенность:** высокая (Visa); средняя (дата Mastercard — через Worldline).
- **Цитата:** пересказ — Visa FAQ, вопрос 1: с апреля 2022 Visa требует от всех эквайеров и процессингов поддержки новой длины issuing BIN по ISO/IEC 7812-1. Вопрос 7: PAN и токены остаются 16-значными.

### 9. Пропускная способность сети и годовые объёмы
- **Утверждение:** сеть рассчитана на N транзакций в секунду.
- **Значение:**
  - **Visa:** сеть обрабатывает «до **83 000** транзакционных сообщений в секунду» (transaction messages per second) по всему миру. Там же: 7 независимых дата-центров, доступность 99,9999%. Прежняя официальная цифра — «более 65 000 сообщений в секунду» (ёмкость на август 2017).
  - **Visa FY2025** (год до 30.09.2025): 329 млрд транзакций под брендом Visa, из них **258 млрд обработаны сетью Visa** (в годовом отчёте 257,5 млрд).
  - **Mastercard 2025:** **175,5 млрд** «switched transactions». Официальной цифры ёмкости в транзакциях в секунду не найдено.
- **Источник:** [Visa — «Inside Visa’s engine of global commerce» (Rajat Taneja, President of Technology)](https://corporate.visa.com/en/sites/visa-perspectives/security-trust/inside-visa-global-commerce-engine.html); [Visa 10-K FY2025 (SEC)](https://www.sec.gov/Archives/edgar/data/1403161/000140316125000089/v-20250930.htm); [VisaNet Network Processing Overview (65 000)](https://corporate.visa.com/dam/VCOM/download/corporate/media/visanet-technology/VisaNet-Network-Processing-Overview.pdf); [Mastercard 10-K FY2025 (SEC)](https://www.sec.gov/Archives/edgar/data/1141391/000114139126000013/ma-20251231.htm).
- **Дата источника:** статья Visa — 29.10.2025; Visa 10-K — FY2025 (ноябрь 2025); Mastercard 10-K — FY2025 (февраль 2026). 10-K Visa за FY2026 к дате проверки ещё не вышел.
- **Уверенность:** высокая (Visa 83 000 и 258 млрд; Mastercard 175,5 млрд); «не подтверждено» — ёмкость Mastercard в TPS.
- **Цитата:** пересказ — Visa (29.10.2025): за «split-second» транзакцией стоит сеть, обрабатывающая до 83 000 transaction messages per second. 10-K Visa FY2025: из 329 млрд транзакций 258 млрд обработаны Visa.
- **Примечание:** на сайте пишите «до 83 000 сообщений в секунду» (не «транзакций»: одна покупка порождает несколько сообщений). Средняя нагрузка — около 8 000 транзакций в секунду (258 млрд ÷ 31,5 млн с). Это **мой расчёт**, не цифра Visa.

### 10. Скорость антифрод-скоринга (Visa VAA, Mastercard Decision Intelligence)
- **Утверждение:** сеть и банк оценивают риск транзакции за миллисекунды.
- **Значение:**
  - **Visa Advanced Authorization:** сейчас — анализ до 400 риск-атрибутов **менее чем за миллисекунду**. В 2019 году — «около одной миллисекунды» на каждую транзакцию, 500+ атрибутов.
  - **Mastercard Decision Intelligence (Pro):** генеративный ИИ улучшает оценку DI **менее чем за 50 мс**. DI помогает банкам оценивать около 143 млрд транзакций в год.
- **Источник:** [Visa — Secure card payments (VAA)](https://www.visa.com/en-us/solutions/secure-card-payments); [Visa, пресс-релиз 17.06.2019](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.16421.html); [Mastercard, пресс-релиз 01.02.2024](https://newsroom.mastercard.com/news/press/2024/february/mastercard-supercharges-consumer-protection-with-gen-ai).
- **Дата источника:** страница Visa — открыта 2026-10-09; Visa PR — 17.06.2019; Mastercard PR — 01.02.2024.
- **Уверенность:** высокая.
- **Цитата:** пересказ — Visa: VAA анализирует 400 риск-атрибутов «in less than a millisecond». Mastercard: «In less than 50 milliseconds» технология улучшает итоговую оценку DI.
- **Примечание:** < 1 мс и < 50 мс — время **скоринга**, а не всего решения эмитента (баланс, лимиты, проверка ARQC, сеть).

### 11. Полное время авторизации «касание → Одобрено»
- **Утверждение:** весь путь туда и обратно занимает около секунды.
- **Значение:** **точной официальной цифры нет.** Официальные формулировки только качественные:
  - Visa: оплата касанием занимает «считанные секунды»; держать карту у терминала — «одной-двух секунд хватит»; сеть возвращает ответ «за миллисекунды».
  - Stripe: процесс авторизации карты обычно длится «несколько секунд».
  - Верхняя граница со стороны эмитента: Stripe Issuing и Adyen Issuing дают серверу эмитента **до 2 секунд** (2000 мс) на ответ. Если ответа нет, срабатывает запасное правило.
- **Источник:** [Visa USA — Contactless payments](https://usa.visa.com/pay-with-visa/contactless-payments/contactless-payments.html); [Visa — Inside Visa’s engine of global commerce](https://corporate.visa.com/en/sites/visa-perspectives/security-trust/inside-visa-global-commerce-engine.html); [Stripe — Card authorization explained](https://stripe.com/resources/more/card-authorization-explained); [Stripe Docs — Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations); [Adyen Docs — Issuing authorisation](https://docs.adyen.com/issuing/authorisation).
- **Дата источника:** Stripe resource — обновлено 09.04.2026; статья Visa — 29.10.2025; остальное открыто 2026-10-09.
- **Уверенность:** высокая (качественные формулировки и таймаут 2 с); число «~1,2 с» — **не подтверждено**, только иллюстрация.
- **Цитата:** пересказ — Stripe Issuing: если ответ не пришёл за 2 секунды, авторизация автоматически одобряется или отклоняется по настройкам таймаута. Adyen: у сервера до 2000 мс на ответ.
- **Примечание:** на сайте пишите «обычно всё занимает секунду-две» и не утверждайте конкретную цифру. В HUD значение 1,2 с — иллюстрация (см. раздел про тайминги).

### 12. Авторизация ≠ перевод денег; клиринг и расчёты позже, пачкой
- **Утверждение:** за секунду деньги не перемещаются. Банк только блокирует сумму (hold). Клиринг и расчёты идут позже, пачками.
- **Значение:**
  - **Авторизация** — одобрение или отказ до завершения покупки. При авторизации эмитент ставит холд на сумму, деньги не двигаются (Visa 10-K, Stripe).
  - **Клиринг** (передача финальных данных от эквайера эмитенту, расчёт сборов) — отдельным сообщением позже. Для POS клиринговые сообщения **обычно собираются в пачку (batch)** и уходят эквайеру при закрытии дня (Visa TADG §1.3.1, dual-message).
  - **Расчёты (settlement)** — перевод нетто-позиций между банками. По Visa: «каждый рабочий день, на нетто-основе за транзакции предыдущего цикла». Большая часть расчётов в долларах США завершается в тот же день расчёта, в других валютах — обычно 1–2 рабочих дня.
  - **Выплата магазину** зависит от эквайера: Stripe в США — **2 рабочих дня**, в Германии и Ирландии по умолчанию — **3 рабочих дня** (первая выплата — 7 календарных дней). У Adyen задержка настраивается, в примере документации — 2 рабочих дня.
  - Холд при оплате картой «вживую» (Stripe Terminal) действует: Visa — 5 дней (точнее 4 дня 18 ч), Mastercard — 2 дня.
- **Источник:** [Visa TADG v3.3, §1.3.1](https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide.pdf); [Visa 10-K FY2007 (определения)](https://www.sec.gov/Archives/edgar/data/0001403161/000119312507270394/d10k.htm); [Visa 10-K FY2025 (сроки расчётов)](https://www.sec.gov/Archives/edgar/data/1403161/000140316125000089/v-20250930.htm); [Stripe — Card authorization explained](https://stripe.com/resources/more/card-authorization-explained); [Stripe Docs — Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method); [Stripe Docs — Payouts (settlement timing by country)](https://docs.stripe.com/payouts); [Adyen Docs — Settle funds](https://docs.adyen.com/platforms/settle-funds).
- **Дата источника:** TADG — август 2025; Visa 10-K FY2007 (определения не изменились по смыслу) и FY2025; Stripe — 2026.
- **Уверенность:** высокая (механизм, batch, сроки выплат Stripe); средняя (обобщение «межбанковский расчёт обычно на следующий рабочий день» — вывод из описания цикла Visa, а не прямая цитата).
- **Цитата:** пересказ — Visa TADG §1.3.1: при dual-message авторизация идёт в момент покупки, а клиринг позже другим сообщением; клиринговые сообщения обычно собираются в пачку и отправляются эквайеру в конце дня. Stripe: деньги во время авторизации не двигаются.
- **Примечание (что такое T+1 и T+2):** T — день покупки. Межбанковский расчёт по транзакциям, которые попали в пачку дня T, обычно проходит в следующем расчётном цикле, то есть около T+1 рабочего дня. На счёт кофейни деньги приходят по графику эквайера: T+2 у Stripe в США, T+3 в ЕС. Для текста сайта: «на следующий рабочий день банки рассчитываются между собой, а кофейня получает деньги через 1–3 рабочих дня».

### 13. Коды ответа: «00» и типичные отказы
- **Утверждение:** ответ банка — двузначный код. «00» — одобрено, остальные коды — причины отказа.
- **Значение:** 00 — Approved or completed successfully; **05 — Do not honor** («не обслуживать», общий отказ); **51 — Insufficient funds / over credit limit** (недостаточно средств или превышен лимит); 54 — Expired card; 61 — Exceeds withdrawal amount limit.
- **Источник:** [Mastercard Developers — Network Response Codes (DE 39)](https://developer.mastercard.com/mastercard-send-person-to-person/documentation/response-error-codes/network-response-codes/); [NIBSS — DE39](https://testdocs.nibss-plc.com.ng/pos/pos-interface-specifications-iso-8583-1987-version/data-element-definition-de39-de48).
- **Дата источника:** открыто 2026-10-09 (дат на страницах нет).
- **Уверенность:** высокая.
- **Цитата:** пересказ — Mastercard: код ответа объясняет причину одобрения или отказа и передаётся в DE 39 ответа эмитента. В таблице: 00 — Approved or completed successfully; 05 — Do not honor; 51 — Insufficient funds/over credit limit.
- **Примечание:** точные расшифровки немного отличаются у разных сетей и процессингов (у NIBSS 51 = «Not sufficient funds»).

### 14. ЕС: потолки interchange 0,2% и 0,3% (IFR)
- **Утверждение:** в ЕС interchange по потребительским картам ограничен законом: 0,2% для дебетовых и 0,3% для кредитных.
- **Значение:** ст. 3(1) — дебет ≤ **0,2%** от суммы; ст. 4 — кредит ≤ **0,3%**. Действует с 09.12.2015. Для внутренних дебетовых операций страны могут разрешить ≤ €0,05 за транзакцию (ст. 3(2)). Не распространяется на корпоративные карты и трёхсторонние схемы (ст. 1(3)). **Сборы платёжных схем (scheme fees) регламент не ограничивает.** Он требует только показывать их отдельной строкой (ст. 9(2)). Исследование для Еврокомиссии прямо называет scheme fees сборами, «не ограниченными IFR».
- **Источник:** [Regulation (EU) 2015/751, EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015R0751); [EY & Copenhagen Economics — Study on the application of the Interchange Fee Regulation, Final Report (для Европейской комиссии)](https://copenhageneconomics.com/publication/study-on-the-application-of-the-interchange-fee-regulation/).
- **Дата источника:** регламент — 29.04.2015 (OJ L 123, 19.05.2015), ст. 3–4 применяются с 09.12.2015; исследование — март 2020.
- **Уверенность:** высокая.
- **Цитата:** «shall not offer or request a per transaction interchange fee of more than 0,2 % of the value of the transaction» (ст. 3(1); в ст. 4 то же для 0,3 %). Исследование, с. 83 (раздел 4, вводная часть): scheme fees перечислены среди сборов, «not capped by the IFR» (пересказ).

### 15. США: Regulation II (дебет) — потолок и статус пересмотра
- **Утверждение:** в США регулируется только дебет крупных банков: 21¢ + 0,05% + 1¢.
- **Значение:**
  - **Текущий потолок** для «covered» эмитентов (активы **≥ $10 млрд**): **21¢ + 0,05% от суммы + 1¢** надбавки за антифрод (если эмитент соблюдает стандарты). Visa в тарифах от 18.04.2026 показывает для регулируемого дебета «0,05% + $0,21» и +$0,01 за антифрод.
  - **Предложение ФРС от 25.10.2023** (14,4¢ + 0,04% + 1,3¢, с пересмотром раз в два года) **не принято** на 09.10.2026. Финального правила в доступных источниках нет.
  - **Суд:** 06.08.2025 федеральный суд Северной Дакоты (дело Corner Post) признал стандарт превышением полномочий ФРС и отменил его. Отмена **приостановлена до решения апелляции** (8-й округ, № 25-3000). На дату проверки решения апелляции не найдено. Суд в Кентукки (сентябрь 2025) правило поддержал, апелляция идёт в 6-м округе. Пока действует 21¢ + 0,05% + 1¢.
  - Не регулируются: эмитенты с активами < $10 млрд (exempt) и **все кредитные карты**.
- **Источник:** [ФРС — NPR Regulation II, 25.10.2023 (PDF)](https://www.federalreserve.gov/aboutthefed/boardmeetings/frn-reg-ii-20231025.pdf); [ФРС — пресс-релиз 25.10.2023](https://www.federalreserve.gov/newsevents/pressreleases/bcreg20231025a.htm); [ФРС — Regulation II FAQ ($10 млрд)](https://www.federalreserve.gov/paymentsystems/regii-faqs.htm); [Visa USA Interchange Reimbursement Fees, 18.04.2026](https://usa.visa.com/content/dam/VCOM/download/merchants/visa-usa-interchange-reimbursement-fees.pdf); [ABA Banking Journal — North Dakota federal court vacates Regulation II](https://bankingjournal.aba.com/2025/09/north-dakota-federal-court-vacates-regulation-ii/).
- **Дата источника:** NPR — 25.10.2023; Visa — 18.04.2026; ABA — 02.09.2025.
- **Уверенность:** высокая (размер потолка); средняя (статус на октябрь 2026: решение 8-го округа могло выйти совсем недавно и не попасть в поиск).
- **Цитата:** «the interchange fee can be no more than the sum of a base component of 21 cents, an ad valorem component of 5 basis points» (ФРС, NPR 2023, Summary). Предложение: «the base component would be 14.4 cents, the ad valorem component would be 4.0 basis points».

### 16. США: типичный interchange по кредитным картам (и средние по дебету)
- **Утверждение:** в США interchange по кредиткам не ограничен, при оплате «вживую» он обычно 1,5–2,7% плюс фиксированная часть.
- **Значение (Visa USA, consumer credit, card present, с 18.04.2026):**
  - **Restaurant** (карта присутствует): Traditional и прочие — **2,10% (min $0,04)**; Signature, Signature Preferred, Infinite — **2,60% (min $0,04)**.
  - **Small Ticket:** 1,90% / 2,20% (min $0,04).
  - **Retail (Performance Threshold I–III):** 1,43–1,51% + $0,10 (Traditional); до 2,30% + $0,10 (Infinite).
  - **Supermarket:** 1,18–1,65% + $0,05.
  - Дебет у exempt-эмитентов: CPS/Restaurant 1,19% + $0,10; CPS/Small Ticket 1,55% + $0,04.
  - **Mastercard** (с 17.04.2026), Small Ticket card present для покупок **≤ $5**: Core 1,65% + $0,02 … World Elite 2,30% + $0,02. Значение взято из выдержки официального PDF, сам PDF напрямую не открылся (403).
  - **Средние по дебету (ФРС, данные 2023):** covered-транзакции — $0,23 (0,47% суммы); exempt — $0,52 (1,21%). Средний чек — $46,26.
- **Источник:** [Visa USA Interchange Reimbursement Fees, 18 April 2026](https://usa.visa.com/content/dam/VCOM/download/merchants/visa-usa-interchange-reimbursement-fees.pdf); [Mastercard 2026–2027 U.S. Region Interchange Programs and Rates (eff. 17.04.2026)](https://www.mastercard.com/content/dam/mccom/us/business/documents/merchant-rates-2026-2027-april2026.pdf); [ФРС — 2023 Interchange Fee Revenue, Covered Issuer Cost, and Covered Issuer and Merchant Fraud Loss](https://www.federalreserve.gov/paymentsystems/2023-interchange-fee.htm).
- **Дата источника:** Visa — 18.04.2026; Mastercard — 17.04.2026; ФРС — данные за 2023.
- **Уверенность:** высокая (Visa, ФРС); средняя (Mastercard).
- **Цитата:** пересказ — Visa, таблица «Consumer Credit, Card Present», строка «Restaurant 2»: 2,60% (min $0,04) для Infinite/Signature и 2,10% (min $0,04) для Traditional Rewards и All Other Products. ФРС, Table 5 (2023): covered transactions — $0,23 и 0,47%; exempt — $0,52 и 1,21%.
- **Примечание:** Visa прямо пишет, что магазин платит не interchange, а «merchant discount» своему банку. Interchange — его составная часть.

### 17. Сборы платёжных сетей (scheme / network fees)
- **Утверждение:** сеть берёт свой сбор отдельно от interchange. Он намного меньше interchange.
- **Значение:**
  - **ЕС (исследование для Еврокомиссии, данные 2017):** средний сбор схем, который платят эквайеры (без processing fees), — **0,030%** от суммы по всем картам (0,022% в 2015). По данным эквайеров: дебет **0,036%**, кредит **0,083%** (иногда с processing fees). Средний **полный** сбор с магазина (MSC) в 2017: дебет ≈ **0,32%**, кредит ≈ **0,73%**.
  - **Рост с тех пор:** британский регулятор PSR (06.03.2025) — Visa и Mastercard подняли основные scheme и processing fees для эквайеров **как минимум на 25% с 2017 года**. Это данные по Великобритании, для ЕС — ориентир.
  - **США, дебет (ФРС, 2023):** сетевые сборы — в среднем **$0,129 за транзакцию** (≈ **0,28%** суммы), из них **64,9%** платят эквайеры и магазины.
  - **США, сторона эквайера (pass-through Wells Fargo, с 01.07.2026):** Visa — 0,14% (кредит) / 0,13% (дебет) + Acquirer Processing Fee $0,0195 (кредит) / $0,0155 (дебет) за авторизацию. Mastercard — 0,1475% + NABU $0,0195. Это не все сборы: есть ежемесячные (например, FANF) и другие.
- **Источник:** [EY & Copenhagen Economics — Study on the application of the IFR, Final Report, с. 118–119 (scheme fees) и с. 143 (MSC)](https://copenhageneconomics.com/publication/study-on-the-application-of-the-interchange-fee-regulation/); [PSR — Market review of card scheme and processing fees: final report](https://www.psr.org.uk/mr22-1-10-scheme-and-processing-fees-final-report/); [ФРС — 2023 Interchange Fee data](https://www.federalreserve.gov/paymentsystems/2023-interchange-fee.htm); [Wells Fargo Merchant Services — Payment Network Pass-Through Fee Schedule (eff. July 1, 2026)](https://wellsfargo.com/merchantpassthroughfees).
- **Дата источника:** исследование ЕС — март 2020 (данные 2015–2017); PSR — 06.03.2025; ФРС — данные 2023; Wells Fargo — 01.07.2026.
- **Уверенность:** высокая (как опубликованные значения); средняя (как оценка для кофе в 2026: данные ЕС устарели, а сборы США сложные и многокомпонентные).
- **Цитата:** «The average network fee per transaction increased to $0.129 in 2023» (ФРС). По ЕС, пересказ с. 118: средневзвешенный сбор схем с эквайера вырос с 0,022% в 2015 до 0,030% в 2017.

### 18. Полная комиссия эквайера: опубликованные тарифы
- **Утверждение:** небольшая кофейня платит эквайеру единый процент. Из него оплачиваются interchange, сбор сети и наценка эквайера.
- **Значение:**
  - **Stripe, США, оплата вживую (Terminal):** **2,7% + 5¢** за успешную транзакцию по американской карте (+1,5% за иностранные карты). Онлайн — 2,9% + 30¢.
  - **Stripe, Германия, Terminal:** **1,4% + €0,10** для карт ЕЭЗ; 2,9% + €0,10 для карт не из ЕЭЗ. Онлайн: стандартные карты ЕЭЗ — 1,5% + €0,25, премиальные — 2,8% + €0,25.
  - **Stripe, Ирландия:** онлайн — 1,5% + €0,25. Тарифа за транзакцию через Terminal на странице нет (только подписка €9 за ридер в месяц), поэтому для ЕС берём Германию.
  - **Adyen (Interchange++):** фиксированный processing fee **$0,13** + interchange и scheme fees по факту + **0,60%** наценки (Visa/Mastercard, «Global»). EUR-цены на странице нет.
- **Источник:** [Stripe Pricing (US)](https://stripe.com/pricing); [Stripe Preise (DE)](https://stripe.com/de/pricing); [Stripe Pricing (IE)](https://stripe.com/ie/pricing); [Adyen Pricing](https://www.adyen.com/pricing).
- **Дата источника:** открыто 2026-10-09 (страницы без даты, цены «на сегодня»).
- **Уверенность:** высокая.
- **Цитата:** пересказ — Stripe US, раздел Terminal: «2.7% + 5¢» за успешную транзакцию по внутренним картам. Stripe DE, Terminal: «1,4 % + 0,10 €» для карт ЕЭЗ. Adyen: Visa — «Interchange+ + 0.60%», processing fee $0.13.
- **Примечание:** наценку эквайера по формуле «итог − interchange − сбор сети» можно только **оценить**. Её никто не публикует.

---

## Дополнительные факты (пригодятся в тексте)

### Д1. MCC кофейни
- **Утверждение:** в сообщении указан тип магазина (MCC). Для кофейни это 5814.
- **Значение:** MCC **5814 — Fast Food Restaurants**, в списке «Included» прямо указаны **Coffee Shops**. Кафе с обслуживанием за столиками — 5812 (Eating Places and Restaurants, в т.ч. «Cafes»).
- **Источник:** [Visa Merchant Data Standards Manual, April 2026](https://usa.visa.com/content/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf)
- **Дата источника:** апрель 2026.
- **Уверенность:** высокая.
- **Цитата:** пересказ — MCC 5814: еда и напитки на месте или навынос, заказ и оплата обычно у стойки, в киоске или через drive-through. Включает Coffee Shops.

### Д2. Скорость сигнала в оптоволокне (для «перелётов» пакета)
- **Утверждение:** задержка распространения в оптоволокне около 5 мкс на километр.
- **Значение:** **5 мкс/км**. 1 000 км ≈ 5 мс в одну сторону, 10 000 км ≈ 50 мс.
- **Источник:** [ITU-T G.114 (05/2003), Annex A, Table A.1](https://www.itu.int/rec/T-REC-G.114-200305-I/en)
- **Дата источника:** май 2003 (действующая редакция).
- **Уверенность:** высокая.
- **Цитата:** пересказ — Table A.1: «Optical fibre cable system, digital transmission — 5 µs/km» (плановое значение).

### Д3. «Сообщение облетает полмира» — осторожно
- **Утверждение (из черновика):** за секунду сообщение облетает полмира.
- **Значение:** **не подтверждено как общее правило.** Visa в маркетинговой статье пишет, что к моменту, когда бариста подаёт кофе, транзакция «уже облетела земной шар» (пересказ). Но местные покупки по местной карте часто обрабатываются в своём регионе. У Visa 7 дата-центров.
- **Источник:** [Visa — Inside Visa’s engine of global commerce](https://corporate.visa.com/en/sites/visa-perspectives/security-trust/inside-visa-global-commerce-engine.html)
- **Дата источника:** 29.10.2025.
- **Уверенность:** средняя.
- **Цитата:** пересказ — Visa: пока бариста подаёт кофе, транзакция уже успевает «обогнуть земной шар» (образ из статьи, не техническое описание маршрута).
- **Примечание:** честнее писать: «сообщение может пролететь тысячи километров до дата-центра сети и банка».

---

## Что НЕ удалось подтвердить (и как писать)

| Тезис | Статус | Как писать на сайте |
|---|---|---|
| Ровно «~4 см» по EMV из самой спецификации EMVCo | спецификация закрыта; подтверждено производителем чипов (средняя) | «в паре сантиметров; стандарт проверяет терминалы на расстоянии до 4 см» |
| Требование Mastercard к времени обмена карта–терминал | только пресс-релиз Infineon (300 мс для карты) | опираться на Visa: «меньше полсекунды» |
| Полное время «касание → Одобрено» в мс | официальной цифры нет | «обычно секунда-две»; в HUD — иллюстрация |
| Ёмкость Mastercard в транзакциях/с | не найдено | упоминать только Visa (до 83 000 сообщений/с) |
| Решение 8-го округа по Regulation II | на 09.10.2026 не найдено | «потолок 21¢ + 0,05% + 1¢ действует, его пересмотр и суды продолжаются» |
| Актуальный уровень scheme fees в ЕС в 2026 | последние официальные данные — 2017 | «доли процента, сотые доли цента на кофе» с пометкой «оценка» |
| «Десятки миллисекунд» на решение банка целиком | подтверждено только для скоринга (< 1 мс у Visa, < 50 мс у Mastercard) | «антифрод-модель выставляет оценку за миллисекунды; весь ответ банка — за доли секунды» |
| «Облетает полмира» | не как правило | «может пролететь тысячи километров» |

---

## Рекомендации для калькулятора

**Сценарий:** кофе за **5 EUR / 5 USD**, карта присутствует (бесконтактно), потребительская карта Visa или Mastercard, небольшая кофейня (MCC 5814).
**Модель A (по умолчанию)** — так платит маленькая кофейня: единый опубликованный тариф Stripe Terminal. Наценка эквайера = итог − interchange − сбор сети (**оценка**, остаток).
**Модель B (для справки)** — прозрачная модель Interchange++ по опубликованному тарифу Adyen: interchange + scheme fee + 0,60% + $0,13.

Обозначения: **[ПОТОЛОК]** — регуляторный лимит, высокая уверенность; **[ТАРИФ]** — опубликованный тариф сети или эквайера, высокая уверенность; **[ОЦЕНКА]** — расчётная оценка.

### ЕС — дебетовая (5,00 €)
| Компонент | Значение | Основание |
|---|---|---|
| Interchange → банку-эмитенту | **0,010 €** (0,2%) | [ПОТОЛОК] IFR ст. 3(1), [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015R0751). Фактически может быть ниже. |
| Сбор платёжной сети | **≈0,005 €** (≈0,1%; диапазон 0,002–0,01 €) | [ОЦЕНКА]: 0,036% в 2017 ([исследование для ЕК](https://copenhageneconomics.com/publication/study-on-the-application-of-the-interchange-fee-regulation/)) + рост ≥25% с 2017 ([PSR](https://www.psr.org.uk/mr22-1-10-scheme-and-processing-fees-final-report/)) + запас на фиксированные элементы |
| Наценка эквайера | **≈0,155 €** | [ОЦЕНКА] = 0,170 − 0,010 − 0,005 |
| **Итого с кофейни** | **0,170 €** (3,4%) | [ТАРИФ] Stripe DE Terminal 1,4% + €0,10, [stripe.com/de/pricing](https://stripe.com/de/pricing) |
| Кофейня получает | **4,830 €** | расчёт |

### ЕС — кредитная (5,00 €)
| Компонент | Значение | Основание |
|---|---|---|
| Interchange | **0,015 €** (0,3%) | [ПОТОЛОК] IFR ст. 4 |
| Сбор сети | **≈0,005 €** (диапазон 0,004–0,01 €) | [ОЦЕНКА]: 0,083% в 2017 (исследование для ЕК) + рост |
| Наценка эквайера | **≈0,150 €** | [ОЦЕНКА] = 0,170 − 0,015 − 0,005 |
| **Итого** | **0,170 €** (3,4%) | [ТАРИФ] Stripe DE Terminal (для карт ЕЭЗ одна цена, дебет или кредит) |
| Кофейня получает | **4,830 €** | расчёт |

Для сравнения: средний MSC в ЕС в 2017 году — ≈0,32% (дебет) и ≈0,73% (кредит). Это средневзвешенно, там доминируют крупные сети с договорными ставками. У маленькой кофейни на мелком чеке доля выше из-за фиксированной части €0,10. Это хорошая мысль для подписи к калькулятору.

### США — дебетовая, регулируемая (5,00 $)
| Компонент | Значение | Основание |
|---|---|---|
| Interchange | **0,2225 $** (4,45%!) = 0,21 + 0,05%×5 + 0,01 | [ПОТОЛОК] Regulation II, [ФРС](https://www.federalreserve.gov/aboutthefed/boardmeetings/frn-reg-ii-20231025.pdf); в тарифе [Visa 18.04.2026](https://usa.visa.com/content/dam/VCOM/download/merchants/visa-usa-interchange-reimbursement-fees.pdf) — 0,05% + $0,21 (+$0,01) |
| Сбор сети | **≈0,022 $** = 0,13%×5 + $0,0155 | [ОЦЕНКА] по pass-through Wells Fargo (Visa debit), [ссылка](https://wellsfargo.com/merchantpassthroughfees); без ежемесячных сборов |
| Наценка эквайера | **≈ −0,060 $ (в минус)** | [ОЦЕНКА] = 0,185 − 0,2225 − 0,022 |
| **Итого с кофейни** | **0,185 $** (3,7%) | [ТАРИФ] Stripe US Terminal 2,7% + 5¢, [stripe.com/pricing](https://stripe.com/pricing) |
| Кофейня получает | **4,815 $** | расчёт |
| Модель B (Adyen IC++) | итого ≈ **0,405 $**: 0,2225 + 0,022 + 0,03 + 0,13; кофейня получает ≈ 4,595 $ | [ТАРИФ] [adyen.com/pricing](https://www.adyen.com/pricing) + оценка сбора сети |

**Важно для калькулятора.** На кофе за 5 $ регулируемый потолок 21¢ + 0,05% + 1¢ — это почти 4,5%. Это **больше**, чем по многим кредиткам. Эквайер с единым тарифом на такой покупке, по оценке, теряет несколько центов и отбивает их на крупных чеках. Варианты показа: (1) честно показать «эквайер: ≈ −6¢» с подсказкой «зарабатывает на других покупках»; (2) переключиться на модель B. Рекомендую вариант (1): это сильная находка в духе «я и не знал». Для справки: у небольших банков (exempt) Visa CPS/Small Ticket debit = 1,55% + $0,04 → **0,1175 $**.

### США — кредитная (5,00 $)
| Компонент | Значение | Основание |
|---|---|---|
| Interchange | **0,105 $** (2,10%; диапазон 0,095–0,135 $ = 1,9–2,7%) | [ТАРИФ] Visa Restaurant card present, Traditional: 2,10% (min $0,04); Signature/Infinite 2,60% → 0,13 $; Small Ticket 1,90–2,20%; Mastercard Small Ticket ≤$5: 1,65% + 2¢ … 2,30% + 2¢ |
| Сбор сети | **≈0,027 $** = 0,14%×5 + $0,0195 | [ОЦЕНКА] по pass-through Wells Fargo (Visa credit; у Mastercard 0,1475% + $0,0195 ≈ так же) |
| Наценка эквайера | **≈0,053 $** | [ОЦЕНКА] = 0,185 − 0,105 − 0,027 |
| **Итого с кофейни** | **0,185 $** (3,7%) | [ТАРИФ] Stripe US Terminal 2,7% + 5¢ |
| Кофейня получает | **4,815 $** | расчёт |
| Модель B (Adyen IC++) | итого ≈ **0,292 $**: 0,105 + 0,027 + 0,03 + 0,13 | [ТАРИФ] + оценка |

**Замечания по конфигу.**
- Храните для каждого случая: `interchange {pct, fixed, min, source, kind:'cap'|'tariff'}`, `scheme {pct, fixed, source, kind:'estimate'}`, `acquirerTotal {pct, fixed, source}`. Наценку считайте как остаток, со знаком (может быть отрицательной).
- Для произвольной суммы S: EU debit IC = 0,002·S; EU credit IC = 0,003·S; US reg. debit IC = 0,21 + 0,0005·S + 0,01; US credit IC = max(0,021·S; 0,04) (Visa Restaurant, Traditional). Stripe: EU = 0,014·S + 0,10; US = 0,027·S + 0,05.
- Сумма по умолчанию «500 ₽» этими данными **не покрывается**: российская система работает по другим правилам. Рекомендую по умолчанию 5 EUR / 5 USD.

---

## Рекомендации по таймингам HUD

Источник есть только у отмеченных границ. Остальное — **иллюстрация**, правдоподобная, но не измеренная. Итог ~1,2 с согласован с «обычно секунда-две» (Visa, Stripe), но **как точное число не подтверждён**.

| Этап (сцена) | Время в HUD | Длительность | Основание |
|---|---|---|---|
| Касание: поле терминала запитывает карту, обнаружение и выбор приложения (сц. 1) | 0 → ~50 мс | ~50 мс | иллюстрация (то, что карту питает поле, — источник: ISO/IEC 14443-2) |
| Чип считает ARQC, обмен «карта ↔ терминал», **писк «можно убирать карту»** (сц. 2) | ~50 → **~400 мс** | весь обмен < 500 мс | **источник:** Visa TADG §2.11, чтение карты < 500 мс; 400 мс — иллюстрация внутри лимита. Писк до онлайн-авторизации — **источник:** TADG §5.2.8 |
| Терминал → эквайер (сеть, 4G или интернет, шифрование) (сц. 3) | ~400 → ~600 мс | ~200 мс | иллюстрация |
| Эквайер → платёжная сеть → эмитент (сц. 4) | ~600 → ~800 мс | ~200 мс | иллюстрация; физика: 5 мкс/км (ITU-T G.114) — 2 000 км ≈ 10 мс, основное время уходит на обработку, а не на расстояние |
| Решение эмитента: баланс, лимиты, проверка ARQC, антифрод (сц. 5) | ~800 → ~900 мс | ~100 мс | частично источник: скоринг Visa VAA < 1 мс, Mastercard DI < 50 мс; таймаут эмитента у Stripe и Adyen — до 2 000 мс |
| Обратный путь эмитент → сеть → эквайер → терминал, «Одобрено», двойной писк (сц. 6) | ~900 → **~1 200 мс** | ~300 мс | иллюстрация |
| **Итого** | **≈ 00:01.200** | | иллюстрация; официально только «seconds» / «a few seconds» |
| Клиринг (пачка в конце дня) → межбанковские расчёты → деньги кофейне (сц. 7) | часы → ~T+1 → T+2…T+3 | | источник: Visa TADG §1.3.1 (batch), Visa 10-K (расчёты каждый рабочий день), Stripe Payouts (US 2 раб. дня, DE/IE 3) |

Подпись под HUD (рекомендация): «Тайминги — иллюстрация. Visa требует, чтобы карта читалась быстрее 0,5 с, а весь путь обычно занимает секунду-две».

---

## Готовые формулировки для плейсхолдеров раскадровки

- Сц. 1: «…на частоте **13,56 МГц**» ✔. «…дальше **пары сантиметров** поле слишком слабое (стандарт проверяет терминалы на расстоянии до 4 см)».
- Сц. 2: таймер ~50 → **~400 мс** ✔ (внутри требования Visa < 500 мс). Врезка про писк ✔ (Visa TADG).
- Сц. 3: «стандарт, которому **почти 40 лет** — ISO 8583 (1987)». Поля 0100 ✔, MCC 5814 (кофейни) ✔.
- Сц. 4: «6–8 цифр BIN» ✔. «Сеть Visa обрабатывает **до 83 000 сообщений в секунду**» ✔.
- Сц. 5: «за **доли секунды** банк проверяет… антифрод-модель выставляет оценку **за миллисекунды**». «`00` значит „одобрено“» ✔. Можно показать 05 и 51.
- Сц. 6: «Весь путь туда и обратно — **обычно секунда-две**». HUD 00:01.2xx — иллюстрация.
- Сц. 7: «на **следующий рабочий день** банки рассчитываются между собой; кофейня получает деньги через **1–3 рабочих дня**».
- Сц. 8: «в ЕС interchange ограничен законом: 0,2% по дебету, 0,3% по кредиту. В США закон ограничивает только дебет крупных банков (21¢ + 0,05%), а кредитки не регулируются».

---

## Сводный список источников (для блока «Источники»)

1. ECMA-352 (3rd ed., 2013) — https://www.ecma-international.org/wp-content/uploads/ECMA-352_3rd_edition_june_2013.pdf
2. ISO/IEC 14443-2:2020 — https://www.iso.org/standard/73597.html (предпросмотр: https://assets.vde-verlag.de/iec-normen/preview-pdf/info_isoiec14443-2%7Bed4.0%7Den.pdf)
3. NFC Forum — NFC Technology — https://nfc-forum.org/learn/nfc-technology/
4. ams AS3911 EMVCo reference design (2012) — https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/12/AS3911_EMVCO.pdf
5. Visa USA — Contactless payments — https://usa.visa.com/pay-with-visa/contactless-payments/contactless-payments.html
6. Visa TADG v3.3 (Aug 2025) — https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide.pdf
7. Visa TADG v3.1 (Nov 2016) — https://usa.visa.com/content/dam/VCOM/regional/na/us/partner-with-us/documents/transaction-acceptance-device-guide-tadg.pdf
8. Infineon PR (2015) — https://www.infineon.com/cms/en/about-infineon/press/market-news/2015/INFCCS201511-009.html
9. EMVCo — EMV Contact Chip — https://www.emvco.com/emv-technologies/emv-contact-chip/
10. EMVCo — Payment Tokenisation — https://www.emvco.com/emv-technologies/payment-tokenisation/
11. Bond et al., «Be Prepared: The EMV Pre-play Attack» — https://murdoch.is/papers/ieeesp15beprepared.pdf
12. Apple — Apple Pay security and privacy overview — https://support.apple.com/en-us/101554
13. Google — Device tokens in Google Wallet — https://blog.google/products/google-pay/device-tokens-google-wallet/
14. ISO 8583:1987 — https://www.iso.org/standard/15870.html ; ISO 8583:2023 — https://www.iso.org/standard/79451.html
15. NIBSS POS Interface Spec (ISO 8583-1987) — https://testdocs.nibss-plc.com.ng/pos/pos-interface-specifications-iso-8583-1987-version/external-message-type.md
16. Mastercard Developers — Network Response Codes — https://developer.mastercard.com/mastercard-send-person-to-person/documentation/response-error-codes/network-response-codes/
17. ISO/IEC 7812-1:2017 — https://www.iso.org/standard/70484.html
18. Visa — Eight-Digit BIN FAQ (2020) — https://usa.visa.com/dam/VCOM/global/partner-with-us/documents/visa.com-numerics-faq.pdf ; Service Provider sheet — https://www.visa.fr/content/dam/VCOM/global/partner-with-us/documents/service-provider-action-sheet.pdf
19. Worldline — 8-digit BIN — https://worldline.com/en-lu/home/top-navigation/media-relations/press-release/introduction-of-8-digit-bin
20. Visa — Inside Visa’s engine of global commerce (29.10.2025) — https://corporate.visa.com/en/sites/visa-perspectives/security-trust/inside-visa-global-commerce-engine.html
21. Visa 10-K FY2025 — https://www.sec.gov/Archives/edgar/data/1403161/000140316125000089/v-20250930.htm ; Visa 10-K FY2007 — https://www.sec.gov/Archives/edgar/data/0001403161/000119312507270394/d10k.htm
22. Mastercard 10-K FY2025 — https://www.sec.gov/Archives/edgar/data/1141391/000114139126000013/ma-20251231.htm
23. Visa — Secure card payments (VAA) — https://www.visa.com/en-us/solutions/secure-card-payments ; Visa PR 17.06.2019 — https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.16421.html
24. Mastercard PR 01.02.2024 (Decision Intelligence) — https://newsroom.mastercard.com/news/press/2024/february/mastercard-supercharges-consumer-protection-with-gen-ai
25. Stripe — Card authorization explained — https://stripe.com/resources/more/card-authorization-explained
26. Stripe Docs — Issuing real-time authorizations — https://docs.stripe.com/issuing/controls/real-time-authorizations ; Adyen Docs — Issuing authorisation — https://docs.adyen.com/issuing/authorisation
27. Stripe Docs — Place a hold — https://docs.stripe.com/payments/place-a-hold-on-a-payment-method ; Stripe Docs — Payouts — https://docs.stripe.com/payouts ; Adyen Docs — Settle funds — https://docs.adyen.com/platforms/settle-funds
28. Regulation (EU) 2015/751 — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015R0751
29. EY & Copenhagen Economics, Study on the application of the IFR (2020) — https://copenhageneconomics.com/publication/study-on-the-application-of-the-interchange-fee-regulation/
30. PSR — Card scheme and processing fees final report (2025) — https://www.psr.org.uk/mr22-1-10-scheme-and-processing-fees-final-report/
31. ФРС — Regulation II NPR (2023) — https://www.federalreserve.gov/aboutthefed/boardmeetings/frn-reg-ii-20231025.pdf ; FAQ — https://www.federalreserve.gov/paymentsystems/regii-faqs.htm ; данные 2023 — https://www.federalreserve.gov/paymentsystems/2023-interchange-fee.htm
32. ABA Banking Journal — Reg II vacated (02.09.2025) — https://bankingjournal.aba.com/2025/09/north-dakota-federal-court-vacates-regulation-ii/
33. Visa USA Interchange Reimbursement Fees (18.04.2026) — https://usa.visa.com/content/dam/VCOM/download/merchants/visa-usa-interchange-reimbursement-fees.pdf
34. Mastercard U.S. Interchange Programs and Rates (17.04.2026) — https://www.mastercard.com/content/dam/mccom/us/business/documents/merchant-rates-2026-2027-april2026.pdf
35. Wells Fargo — Payment Network Pass-Through Fee Schedule (01.07.2026) — https://wellsfargo.com/merchantpassthroughfees
36. Stripe Pricing US — https://stripe.com/pricing ; DE — https://stripe.com/de/pricing ; IE — https://stripe.com/ie/pricing
37. Adyen Pricing — https://www.adyen.com/pricing
38. Visa Merchant Data Standards Manual (April 2026) — https://usa.visa.com/content/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf
39. ITU-T G.114 (05/2003) — https://www.itu.int/rec/T-REC-G.114-200305-I/en

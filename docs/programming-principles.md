# Notification Service — Architecture & Code Quality Review

## Executive Summary

Проєкт має хорошу базову шарувату структуру (routes → services → repositories → infra), централізовану обробку помилок, валідацію через Joi та RabbitMQ-based async processing.

Архітектура виглядає достатньо чистою для сервісу середнього масштабу:

- відповідальності між шарами переважно розділені;
- є централізовані middleware та helper-компоненти;
- репозиторії інкапсулюють SQL;
- черга відокремлена від HTTP API.

Кодова база також демонструє використання кількох хороших практик:

- centralized constants;
- reusable validation helpers;
- exception hierarchy;
- queue-based asynchronous processing;
- graceful shutdown handling.

---

## 1) Programming Principles

## SOLID

### S — Single Responsibility Principle

**Дотримується:**

- `src/middleware/validate.ts` — лише валідація request payload.
- `src/middleware/auth.ts` — лише API key authentication.
- `src/repositories/notificationRepository.ts` — лише persistence layer.
- `src/helpers/httpClient.ts` — HTTP abstraction.
- `src/config/database.ts` — database connection management.

---

### O — Open/Closed Principle

**Дотримується:**

- Exception hierarchy через `BaseError` дозволяє легко розширювати типи помилок без зміни `errorHandler`.
- Middleware pipeline добре розширюється новими middleware.

---

### L — Liskov Substitution Principle

**Дотримується:**

- Exception classes коректно наслідують `BaseError` та взаємозамінні в `errorHandler`.

---

### I — Interface Segregation Principle

**Частково дотримується:**

- Типи (`Notification`, `CreateNotificationInput`, `NotificationStats`) достатньо компактні та не перевантажені.

---

### D — Dependency Inversion Principle

**Частково дотримується:**

- Є separation між infrastructure та business logic.
- Репозиторії та сервіси логічно розділені.

---

## DRY

**Дотримується:**

- Централізовані notification statuses.
- Reusable validation helpers.
- Shared middleware/error handling.
- Спільні queue utilities.

---

## KISS

**Добре реалізовано:**

- Простий Express pipeline.
- Логічна структура директорій.
- Прямолінійна queue processing логіка.
- Мінімалістичний service layer.

---

## YAGNI

**Переважно дотримується:**

- У коді немає надлишкових abstraction layers.
- Архітектура не перевантажена enterprise-патернами.
- Queue processing реалізований достатньо просто.

---

## Law of Demeter

**Переважно дотримується:**

- Компоненти взаємодіють через свої безпосередні залежності.
- Repository layer ізолює SQL-деталі від services.

---

## Composition over Inheritance

**Добре реалізовано:**

- Основна архітектура побудована на композиції сервісів і модулів.
- Наслідування використовується лише для exceptions.

---

## Separation of Concerns

**Добре реалізовано:**

Чітко розділені:

- routes
- middleware
- services
- repositories
- queues
- config
- helpers

- API layer не містить SQL.
- Repository layer не містить HTTP logic.
- Middleware не містять бізнес-логіки.

---

## 2) Refactoring Techniques

1. **Extract Function (Винесення функції)**  
   Декомпозиція “товстих” процедур на менші кроки (валідація → створення → постановка в чергу), щоб кожна функція мала одну відповідальність.

2. **Extract Class (Винесення класу)**  
   Виділення окремих класів для ізольованих задач, наприклад сервісів/воркерів/компонентів, щоб зменшити зв’язність і спростити тестування.

3. **Replace Error Handling with Exception Hierarchy (Спеціалізовані винятки замість загальних помилок)**  
   Використання базового класу помилки та похідних (наприклад для validation / not found / forbidden тощо) як спосіб структурувати обробку помилок.

4. **Introduce Parameter Object (Об’єкт параметрів)**  
   Передача складних наборів даних одним об’єктом (DTO/тип даних), замість довгих списків параметрів у функціях.

5. **Move Method / Move Function (Переміщення методу/функції)**  
   Винесення допоміжної логіки в `helpers` або окремі модулі (валідація, HTTP-клієнт, тощо), щоб “бізнес-логіка” не змішувалась з утилітарною.

6. **Extract Module (Винесення модуля)**  
   Розділення коду на шари/директорії (middleware, repositories, queues, helpers, config), що відповідає поступовому виділенню підсистем у модулі.

7. **Encapsulate Database Access (Інкапсуляція доступу до БД) / Repository Pattern**  
   Виділення репозиторіїв як окремого шару доступу до даних: запити та мапінг результатів не “розмазуються” по роутам/сервісам.

---

## 3) Design Patterns

## Явно присутні

1. **Repository Pattern**  
   - **Де:** `src/repositories/notificationRepository.ts`  
   - **Ролі:** Repository (`NotificationRepository`), Data Source (`db.query`)  
   - **Як використовується:** абстрагує SQL-операції create/get/update/stats.

2. **Singleton (module-level singleton)**  
   - **Де:** `src/services/emailService.ts`, `src/queues/emailQueue.ts`, `src/queues/emailWorker.ts`, `src/config/rabbitmq.ts`  
   - **Ролі:** single shared instance per process  
   - **Як використовується:** `export default new ...`.

3. **Facade (частково)**  
   - **Де:** `src/config/database.ts`, `src/config/rabbitmq.ts`  
   - **Ролі:** спрощений API над pg/amqplib  
   - **Як використовується:** `connect/query/checkConnection/close`, `getConsumeChannel/getPublishChannel`.

4. **Factory Method (легка форма)**  
   - **Де:** `src/middleware/validate.ts`  
   - **Ролі:** creator (`validate(schema, source)`), product (middleware function)  
   - **Як використовується:** створення middleware з параметризованою схемою.

5. **Pub/Sub (через брокер)**  
   - **Де:** `src/queues/emailQueue.ts`, `src/queues/emailWorker.ts`  
   - **Ролі:** publisher (`addJob/sendToQueue`), consumer (`consume`)  
   - **Як використовується:** асинхронна доставка jobs через RabbitMQ.

---

## Частково / схоже на патерн

6. **Command (наближено)**  
   - **Де:** payload `EmailJob` (`src/queues/emailQueue.ts`)  
   - **Ролі:** command data object (job), invoker (queue), handler (worker)  
   - **Обмеження:** немає явного Command handler interface.

7. **Chain of Responsibility (middleware pipeline Express)**  
   - **Де:** `src/app.ts`, middleware/*  
   - **Ролі:** handlers chain (`authenticate`, `rateLimitHandler`, `validate`, `errorHandler`)  
   - **Як використовується:** послідовна обробка запиту.

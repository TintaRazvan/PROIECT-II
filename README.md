# Splitmate - Setup si rulare

Aplicatie pentru gestionarea si impartirea cheltuielilor intre utilizatori.

## Cerinte

- Visual Studio 2022 (workload `ASP.NET and web development`)
- .NET 8 SDK
- Node.js LTS (include `npm`)
- Microsoft SQL Server (sau SQL Server Express)
- SQL Server Management Studio (SSMS) - recomandat

## Structura proiectului

- `src/Splitmate` - backend ASP.NET Core Web API
- `src/frontend` - frontend React
- `database/Splitmate_DB_Setup.sql` - script creare baza de date + date test

## 1) Clonare proiect

```bash
git clone <URL_REPO>
cd PROIECT-Info
```

## 2) Initializare baza de date

1. Deschide SSMS si conecteaza-te la instanta locala SQL Server.
2. Deschide fisierul `database/Splitmate_DB_Setup.sql`.
3. Ruleaza scriptul complet (Execute).

Scriptul creeaza tabelele si insereaza date demo.

## 3) Pornire backend (API)

### Varianta A - Visual Studio

1. Deschide `src/Splitmate/SplitmateAPI.sln`.
2. Seteaza proiectul `SplitmateAPI` ca Startup Project (daca este nevoie).
3. Apasa `F5` sau `Ctrl+F5`.

### Varianta B - terminal

```bash
cd src/Splitmate
dotnet restore
dotnet run
```

Backend-ul ruleaza implicit pe:

- `http://localhost:7252`
- (si HTTPS in functie de profilul de launch)

Swagger:

- `http://localhost:7252/swagger`

## 4) Pornire frontend

```bash
cd src/frontend
npm install
npm start
```

Frontend-ul ruleaza pe:

- `http://localhost:3000`

## 5) Cum functioneaza impreuna

- Frontend-ul foloseste `REACT_APP_API_BASE_URL` (fallback local: `http://localhost:7252/api`).
- Trebuie sa rulezi **si backend-ul, si frontend-ul** in acelasi timp.

## 6) Configurare Azure (echipa)

### Backend (Azure App Service)

Seteaza variabilele de mediu in App Service -> Configuration:

- `ConnectionStrings__DefaultConnection` = connection string Azure SQL
- `Cors__AllowedOrigins__0` = URL frontend productie (ex: `https://your-frontend.azurestaticapps.net`)
- `Cors__AllowedOrigins__1` = URL frontend staging/dev (optional)

API-ul expune endpoint de health check:

- `https://<api-app>.azurewebsites.net/health`

### Frontend (Azure Static Web Apps / App Service)

Seteaza:

- `REACT_APP_API_BASE_URL=https://<api-app>.azurewebsites.net/api`

Pentru local, poti copia:

```bash
cd src/frontend
copy .env.example .env.local
```

## 7) Migrari EF Core (obligatoriu in echipa)

Inainte de `dotnet ef database update` pe DB shared:

1. Ruleaza `database/Precheck_StabilizeConstraintsAndExpensePayer.sql`.
2. Rezolva duplicatele de `Email`/`Username` daca exista.
3. Ruleaza update:

```bash
cd src/Splitmate
dotnet ef database update
```

Migrarea adauga:

- coloana `PayerId` in `Expenses`
- indexuri unice pe `Users.Email` si `Users.Username`

## Probleme frecvente

- **Portul 3000 sau 7252 e ocupat**  
  Opreste procesul care foloseste portul sau reporneste aplicatia.

- **`npm` nu este recunoscut**  
  Instaleaza/reinstaleaza Node.js LTS si redeschide terminalul.

- **Eroare la pornirea backend-ului in Visual Studio**  
  Verifica daca ai instalat workload-ul `ASP.NET and web development` si .NET 8 SDK.

- **Frontend-ul porneste, dar API-ul nu raspunde**  
  Verifica daca backend-ul ruleaza pe `http://localhost:7252`.

- **API-ul nu porneste in Azure / local dupa ultimele modificari**  
  Verifica daca ai setat `ConnectionStrings__DefaultConnection` (sau in `appsettings.Development.json` local).

## Comenzi rapide (rezumat)

Backend:

```bash
cd src/Splitmate
dotnet run
```

Frontend:

```bash
cd src/frontend
npm start
```

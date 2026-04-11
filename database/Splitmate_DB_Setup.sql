-- =============================================
-- 1. CURĂȚARE (Ștergem tabelele dacă există deja)
-- =============================================
DROP TABLE IF EXISTS Debts;
DROP TABLE IF EXISTS Expenses;
DROP TABLE IF EXISTS GroupMembers;
DROP TABLE IF EXISTS Friends;
DROP TABLE IF EXISTS Groups;
DROP TABLE IF EXISTS Users;

-- =============================================
-- 2. CREARE TABELE
-- =============================================

CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL
);

CREATE TABLE Groups (
    id INT PRIMARY KEY IDENTITY(1,1),
    groupName NVARCHAR(100) NOT NULL
);

CREATE TABLE GroupMembers (
    groupId INT FOREIGN KEY REFERENCES Groups(id),
    userId INT FOREIGN KEY REFERENCES Users(id),
    PRIMARY KEY (groupId, userId)
);

CREATE TABLE Friends (
    userId INT FOREIGN KEY REFERENCES Users(id),
    friendId INT FOREIGN KEY REFERENCES Users(id),
    PRIMARY KEY (userId, friendId)
);

CREATE TABLE Expenses (
    id INT PRIMARY KEY IDENTITY(1,1),
    amount DECIMAL(18, 2) NOT NULL,
    date DATETIME DEFAULT GETDATE(),
    description NVARCHAR(255),
    groupId INT FOREIGN KEY REFERENCES Groups(id)
);

CREATE TABLE Debts (
    id INT PRIMARY KEY IDENTITY(1,1),
    amount DECIMAL(18, 2) NOT NULL,
    fromUserId INT FOREIGN KEY REFERENCES Users(id),
    toUserId INT FOREIGN KEY REFERENCES Users(id),
    expenseId INT FOREIGN KEY REFERENCES Expenses(id)
);

-- =============================================
-- 3. INSERARE DATE (Câte 3 rânduri per tabel)
-- =============================================

-- Utilizatori
INSERT INTO Users (username, email, password) VALUES 
('Andrei_Boss', 'andrei@yahoo.com', 'parola_secreta_1'),
('Elena_Ionescu', 'elena.i@gmail.com', 'parola_secreta_2'),
('Cristi_99', 'cristi99@outlook.com', 'parola_secreta_3');

-- Grupuri
INSERT INTO Groups (groupName) VALUES 
('Colocatari Ap 24'),
('Proiect Facultate'),
('Iesire la Munte');

-- Membri Grup (Legături)
INSERT INTO GroupMembers (groupId, userId) VALUES 
(1, 1), (1, 2), -- Andrei și Elena sunt în Apartament
(3, 1), (3, 2), (3, 3); -- Toți trei sunt în grupul de Munte

-- Prieteni
INSERT INTO Friends (userId, friendId) VALUES 
(1, 2), -- Andrei e prieten cu Elena
(2, 3), -- Elena e prietenă cu Cristi
(3, 1); -- Cristi e prieten cu Andrei

-- Cheltuieli (Expenses)
INSERT INTO Expenses (amount, description, groupId) VALUES 
(450.00, 'Factura Enel Noiembrie', 1),
(120.00, 'Bilete Intrare Castel', 3),
(35.50, 'Cafele benzinarie', 3);

-- Datorii (Debts)
INSERT INTO Debts (amount, fromUserId, toUserId, expenseId) VALUES 
(225.00, 2, 1, 1), -- Elena îi dă lui Andrei jumătate din curent
(40.00, 3, 2, 2),  -- Cristi îi dă Elenei partea lui de bilet
(11.80, 1, 3, 3);  -- Andrei îi dă lui Cristi partea de cafea

-- =============================================
-- 4. VIZUALIZARE DATE (Rulează tot scriptul și verifică tabelele jos)
-- =============================================
SELECT * FROM Users;
SELECT * FROM Groups;
SELECT * FROM GroupMembers;
SELECT * FROM Friends;
SELECT * FROM Expenses;
SELECT * FROM Debts;
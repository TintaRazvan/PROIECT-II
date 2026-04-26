SELECT 
    (SELECT ISNULL(SUM(amount), 0) FROM Debts WHERE toUserId = 1 AND isPaid = 0) AS De_Primit,
    (SELECT ISNULL(SUM(amount), 0) FROM Debts WHERE fromUserId = 1 AND isPaid = 0) AS De_Dat,
    (SELECT ISNULL(SUM(amount), 0) FROM Debts WHERE toUserId = 1 AND isPaid = 0) - 
    (SELECT ISNULL(SUM(amount), 0) FROM Debts WHERE fromUserId = 1 AND isPaid = 0) AS Balanta_Neta;

-- B. Balanța detaliată pe fiecare prieten
SELECT 
    U.username AS Prieten,
    SUM(CASE WHEN D.toUserId = 1 THEN D.amount ELSE -D.amount END) AS Balanta_Individuala
FROM Debts D
JOIN Users U ON (U.id = D.fromUserId OR U.id = D.toUserId)
WHERE (D.fromUserId = 1 OR D.toUserId = 1) AND D.isPaid = 0 AND U.id <> 1
GROUP BY U.username;

-- C. Simulare plată și vizualizare istoric
-- (Marcăm datoria 2 ca plătită pentru a popula paidAt)
UPDATE Debts SET isPaid = 1, paidAt = GETDATE() WHERE id = 2;

-- Vizualizarea "Ultima oară când ai plătit"
SELECT U.username AS Platit_Catre, D.amount, D.paidAt 
FROM Debts D 
JOIN Users U ON D.toUserId = U.id 
WHERE D.fromUserId = 1 AND D.isPaid = 1 
ORDER BY D.paidAt DESC;
INSERT INTO CUSTOMER (Cust_ID, Cust_Name, Cust_Address, Cust_PhoneNum) VALUES
('1', 'Kendrick', 'Sata, Bilangsa, Maykanto', '09685721171'),
('2', 'Felin', 'Samar, Amiangpu, Sangala', '09519976778'),
('3', 'Ken', '20th Street, Kasiben, Abente', '09222751000'),
('4', 'Kowjie', 'Maha, Bapangal, Anka, Yamaha, Barinto', '09345816943');

INSERT INTO SUPPLIER (Supply_ID, Supply_Name, Supply_PhoneNum, Supply_City, Supply_State, Supply_ZipCode) VALUES
('1', 'National Book Store', '0917-554-2190', 'Quezon City', 'Metro Manila', '1100'),
('2', 'Office Warehouse', '0928-331-8842', 'Makati City', 'Metro Manila', '1200'),
('3', 'Paper One Corp', '0945-667-3015', 'Cebu City', 'Cebu', '6000'),
('4', 'TechSupply Inc.', '0908-112-9934', 'Pasig City', 'Metro Manila', '1605'),
('5', 'Bicol Stationery', '0936-778-4421', 'Legazpi City', 'Albay', '4500');

INSERT INTO PRODUCT (Prod_ID, Prod_Name, Prod_Stock, Prod_Price, Supply_ID) VALUES
('1', 'Black Ballpoint Pen', 251, 10.00, '5'),
('2', 'Spiral Notebook (80 leaves)', 680, 100.00, '3'),
('3', 'Large Brown Envelope', 1090, 30.00, '4'),
('4', '500ml Bottled Water', 1344, 49.00, '2'),
('5', 'Pocket Tissue (3-pack)', 329, 39.25, '2'),
('6', 'Heavy Duty Stapler', 982, 89.50, '1'),
('7', 'Scientific Calculator', 112, 850.00, '4'),
('8', 'Ream of A4 Bond Paper (500 sheets)', 176, 225.00, '3'),
('9', 'Expanding Plastic File Folder', 104, 115.75, '1');

INSERT INTO ORDERS (Order_ID, Cust_ID, Order_Date) VALUES
('1', '1', '2025-10-13'),
('2', '1', '2025-10-13'),
('3', '2', '2025-11-21'),
('4', '3', '2025-11-29'),
('5', '4', '2025-12-01'),
('6', '2', '2025-12-09'),
('7', '3', '2025-12-31');

INSERT INTO PAYMENT (Pay_ID, Order_ID, Pay_Method, Pay_Amount) VALUES
('1', '1', 'direct', 189.50),
('2', '2', 'online', 50.00),
('3', '3','direct', 49.00),
('4', '4', 'credit', 89.50),
('5', '5', 'credit', 78.50),
('6', '6', 'online', 120.00);

INSERT INTO DELIVERYSTOCK (DStock_ID, Prod_ID, DStock_Date, DStock_Stock) VALUES
('1', '9', '2022-03-15', 142),
('2', '2', '2023-07-04', 587),
('3', '4', '2021-11-20', 913),
('4', '1', '2024-01-30', 1204),
('5', '6', '2020-09-12', 46),
('6', '7', '2025-05-25', 839),
('7', '3', '2025-08-14', 12),
('8', '8', '2023-07-04', 85);

INSERT INTO ORDERDETAILS (OrDet_ID, Order_ID, Dstock_ID, OrDet_Quantity) VALUES
('1', '1', '5', 1),
('2', '1', '7', 1),
('3', '2', '4', 5),
('4', '3', '4', 1),
('5', '4', '7', 1),
('6', '5', '1', 2),
('7', '6', '8', 4);

INSERT INTO PURCHASE (Pur_ID, Supply_ID, Pur_Date) VALUES
('1', '3', '2025-1-13'),
('2', '3', '2025-1-30'),
('3', '5', '2025-2-9'),
('4', '2', '2025-3-17'),
('5', '2', '2025-4-11'),
('6', '4', '2025-4-23'),
('7', '1', '2025-6-7'),
('8', '4', '2025-8-7');

INSERT INTO PURCHASEDETAILS (PurDet_ID, Pur_ID, Prod_ID, Pur_Quantity, Pur_UnitPrice) VALUES
('1', '3', '1', 500, 8.00),
('2', '2', '5', 750, 80.00),
('3', '8', '2', 1500, 24.00),
('4', '7', '4', 1500, 39.20),
('5', '2', '9', 750, 31.40),
('6', '8', '7', 1250, 71.60),
('7', '3', '1', 500, 680.00),
('8', '4', '3', 200, 92.60);
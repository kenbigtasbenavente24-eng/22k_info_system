# =================================================================================================================== #
# NOTE
# This file contains the SQL commands to create the database tables for the 22K Information System. It defines
# the structure of each table, including primary keys, foreign keys, and relationships between tables. 
# The tables include Customer, Supplier, Product, Orders, Payment, DeliveryStock, OrderDetails, Purchase,
# PurchaseDetails, and a changelog for tracking all inserts, updates, and deletes across the system.
#
# MAKE SURE YOU NAME THE XAMPP DATABASE "22k_db" AND RUN THIS FILE TO CREATE THE TABLES BEFORE TESTING THE APPLICATION.
# =================================================================================================================== #

CREATE TABLE Customer (
Cust_ID			INT(4)	AUTO_INCREMENT	NOT NULL,
Cust_Name		VARCHAR(100)	NOT NULL,
Cust_Address	VARCHAR(255)	NOT NULL,
Cust_PhoneNum	VARCHAR(15),
CONSTRAINT Customer_PK PRIMARY KEY (Cust_ID)
);

CREATE TABLE Supplier (
Supply_ID		INT(4)	AUTO_INCREMENT NOT NULL,
Supply_Name		VARCHAR(100),
Supply_PhoneNum	VARCHAR(15)		NOT NULL,
Supply_City		VARCHAR(50)		NOT NULL,
Supply_State	VARCHAR(50)		NOT NULL,
Supply_ZipCode	INT(4)			NOT NULL,
CONSTRAINT Supplier_PK PRIMARY KEY (Supply_ID)
);

CREATE TABLE Product (
Prod_ID			INT(4)	AUTO_INCREMENT NOT NULL,
Supply_ID		INT(4),
Prod_Name		VARCHAR(50),
Prod_Stock		INT				NOT NULL,
Prod_Price		DECIMAL(9,2)	NOT NULL,
CONSTRAINT Product_PK PRIMARY KEY (Prod_ID),
CONSTRAINT Product_FK1 FOREIGN KEY (Supply_ID) REFERENCES Supplier (Supply_ID)
ON DELETE CASCADE);

CREATE TABLE Orders (
Order_ID		INT(8)	AUTO_INCREMENT NOT NULL,
Cust_ID			INT(4)	,
Order_Date		DATE			DEFAULT (CURRENT_DATE),
CONSTRAINT Orders_PK  PRIMARY KEY (Order_ID),
CONSTRAINT Orders_FK1 FOREIGN KEY (Cust_ID) REFERENCES Customer (Cust_ID)
ON DELETE CASCADE);

CREATE TABLE Payment (
Pay_ID			INT(8)	AUTO_INCREMENT	NOT NULL,
Order_ID			INT(8)		NOT NULL,
Pay_Method		VARCHAR(10),
Pay_Amount		DECIMAL(9,2)	NOT NULL,
CONSTRAINT Payment_PK PRIMARY KEY (Pay_ID),
CONSTRAINT Payment_FK1 FOREIGN KEY (Order_ID)  REFERENCES Orders (Order_ID)
ON DELETE CASCADE);

CREATE TABLE DeliveryStock (
DStock_ID		INT(4)	AUTO_INCREMENT	NOT NULL,
Prod_ID			INT(4)			NOT NULL,
DStock_Date		DATE			DEFAULT (CURRENT_DATE),
DStock_Stock	INT,
CONSTRAINT DeliveryStock_PK  PRIMARY KEY (DStock_ID),
CONSTRAINT DeliveryStock_FK1 FOREIGN KEY (Prod_ID) REFERENCES Product (Prod_ID)
ON DELETE CASCADE);

CREATE TABLE OrderDetails (
OrDet_ID		INT(8)	AUTO_INCREMENT	NOT NULL,
Order_ID		INT(8)			NOT NULL,
DStock_ID		INT(4)			NOT NULL,
OrDet_Quantity	INT			NOT NULL,
OrDet_UnitPrice	DECIMAL(9,2)	NOT NULL,
CONSTRAINT OrderDetails_PK  PRIMARY KEY (OrDet_ID),
CONSTRAINT OrderDetails_FK1 FOREIGN KEY (Order_ID)  REFERENCES Orders (Order_ID)
ON DELETE CASCADE,
CONSTRAINT OrderDetails_FK2 FOREIGN KEY (DStock_ID) REFERENCES DeliveryStock (DStock_ID)
ON DELETE CASCADE);

CREATE TABLE Purchase (
Pur_ID			INT(8)	AUTO_INCREMENT	NOT NULL,
Supply_ID		INT(4)			NOT NULL,
Pur_Date		DATE,
CONSTRAINT Purchase_PK  PRIMARY KEY (Pur_ID),
CONSTRAINT Purchase_FK1 FOREIGN KEY (Supply_ID) REFERENCES Supplier (Supply_ID)
ON DELETE CASCADE);

CREATE TABLE PurchaseDetails (
PurDet_ID		INT(16)	AUTO_INCREMENT NOT NULL,
Pur_ID			INT(8)			NOT NULL,
Prod_ID			INT(4)			NOT NULL,
Pur_Quantity			INT			NOT NULL,
Pur_UnitPrice		DECIMAL(9,2)	NOT NULL,
CONSTRAINT PurchaseDetails_PK  PRIMARY KEY (PurDet_ID),
CONSTRAINT PurchaseDetails_FK1 FOREIGN KEY (Pur_ID) REFERENCES Purchase (Pur_ID)
ON DELETE CASCADE,
CONSTRAINT PurchaseDetails_FK2 FOREIGN KEY (Prod_ID)  REFERENCES Product (Prod_ID)
ON DELETE CASCADE);

# A changelog table to track all inserts, updates, and deletes across the system
CREATE TABLE changelog (
    Log_ID        INT AUTO_INCREMENT PRIMARY KEY,
    Log_Date      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Log_Table     VARCHAR(50)  NOT NULL,
    Log_RecordID  INT          NOT NULL,
    Log_Action    VARCHAR(255) NOT NULL
);
-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               12.1.2-MariaDB - MariaDB Server
-- Server OS:                    Win64
-- HeidiSQL Version:             12.14.0.7165
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for dreamhouse
CREATE DATABASE IF NOT EXISTS `dreamhouse` /*!40100 DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci */;
USE `dreamhouse`;

-- Dumping structure for table dreamhouse.branch
CREATE TABLE IF NOT EXISTS `branch` (
  `branch_id` int(6) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `branch_code` varchar(50) NOT NULL,
  `address` varchar(300) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` varchar(50) NOT NULL DEFAULT 'SYSTEM',
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `updated_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`branch_id`),
  UNIQUE KEY `uk_branch_per_tenant` (`tenant_id`,`branch_code`),
  KEY `idx_branch_tenant` (`tenant_id`),
  CONSTRAINT `fk_branch_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.daily_process_details
CREATE TABLE IF NOT EXISTS `daily_process_details` (
  `Dailyprocess_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_id` int(11) NOT NULL,
  `Project_name` varchar(40) NOT NULL,
  `DATE` date NOT NULL,
  `Measurement` varchar(50) DEFAULT NULL,
  `Units` int(11) DEFAULT NULL,
  `Nos` decimal(10,4) DEFAULT NULL,
  `Length` decimal(10,4) DEFAULT NULL,
  `breadth` decimal(10,4) DEFAULT NULL,
  `D_H` decimal(10,4) DEFAULT NULL,
  `Quantity` decimal(10,4) DEFAULT NULL,
  `Rate` int(11) DEFAULT NULL,
  `Amount` int(11) NOT NULL DEFAULT 0,
  `Remarks` varchar(100) DEFAULT NULL,
  `Photos` varchar(255) DEFAULT NULL,
  `Paid` int(11) DEFAULT NULL,
  `Balance` int(11) DEFAULT NULL,
  `Status` varchar(50) DEFAULT NULL,
  `Created_by` varchar(100) DEFAULT NULL,
  `CREATED_DATETIME` date DEFAULT NULL,
  `LAST_UPDATED_BY` varchar(100) DEFAULT NULL,
  `LAST_UPDATED_DATETIME` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`Dailyprocess_id`),
  KEY `idx_daily_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_daily_branch` (`branch_id`),
  CONSTRAINT `fk_daily_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_daily_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.labour_worked_details
CREATE TABLE IF NOT EXISTS `labour_worked_details` (
  `Labour_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_id` int(11) NOT NULL,
  `Project_name` varchar(40) NOT NULL,
  `DATE` date NOT NULL,
  `Contractor` varchar(35) DEFAULT NULL,
  `Labour_types` varchar(100) NOT NULL,
  `No_Of_Persons` int(11) NOT NULL,
  `Unit` int(11) DEFAULT NULL,
  `Salary` int(11) NOT NULL DEFAULT 0,
  `Ratio` int(11) NOT NULL DEFAULT 0,
  `Site_location` varchar(255) DEFAULT NULL,
  `Total` int(11) NOT NULL DEFAULT 0,
  `Site_supervisor` varchar(40) DEFAULT NULL,
  `work_verified_by` varchar(100) DEFAULT NULL,
  `Paid` int(11) DEFAULT NULL,
  `Balance` int(11) DEFAULT NULL,
  `Status` varchar(50) DEFAULT NULL,
  `Check_list` int(11) DEFAULT NULL,
  `Created_by` varchar(100) DEFAULT NULL,
  `CREATED_DATETIME` date DEFAULT NULL,
  `LAST_UPDATED_BY` varchar(100) DEFAULT NULL,
  `LAST_UPDATED_DATETIME` date DEFAULT NULL,
  `Payment_Date` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`Labour_id`),
  KEY `idx_labour_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_labour_branch` (`branch_id`),
  CONSTRAINT `fk_labour_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_labour_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3760 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.login_history
CREATE TABLE IF NOT EXISTS `login_history` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `session_id` char(36) NOT NULL,
  `login_time` datetime NOT NULL,
  `logout_time` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `browser_info` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  UNIQUE KEY `session_id` (`session_id`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.mas_labour_details
CREATE TABLE IF NOT EXISTS `mas_labour_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Labour_Details` varchar(100) DEFAULT NULL,
  `Contractor` varchar(35) DEFAULT NULL,
  `Created_by` varchar(50) DEFAULT NULL,
  `created_datetime` date DEFAULT NULL,
  `Salary` int(8) DEFAULT NULL,
  `Ratio` int(5) DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_project_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_project_branch` (`branch_id`),
  CONSTRAINT `fk_project_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.mas_material_list
CREATE TABLE IF NOT EXISTS `mas_material_list` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `Material_Name` varchar(100) DEFAULT NULL,
  `Created_by` varchar(50) DEFAULT NULL,
  `created_datetime` date DEFAULT NULL,
  `Supplier_Name` varchar(30) DEFAULT NULL,
  `Supplier_Contact` varchar(10) DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_daily_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_daily_branch` (`branch_id`),
  CONSTRAINT `fk_daily_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_daily_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.material_payments
CREATE TABLE IF NOT EXISTS `material_payments` (
  `Payment_id` int(3) NOT NULL AUTO_INCREMENT,
  `Project_Id` int(11) DEFAULT NULL,
  `Bill_no` int(7) DEFAULT NULL,
  `Material_name` varchar(50) DEFAULT NULL,
  `Supplier_name` varchar(50) DEFAULT NULL,
  `Material_amount` varchar(50) DEFAULT NULL,
  `Payment_Date` date DEFAULT NULL,
  `Amount` int(11) DEFAULT NULL,
  `Created_by` varchar(50) DEFAULT NULL,
  `Created_Datetime` timestamp NULL DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`Payment_id`),
  KEY `idx_matpay_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_matpay_branch` (`branch_id`),
  CONSTRAINT `fk_matpay_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_matpay_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.material_stock_list
CREATE TABLE IF NOT EXISTS `material_stock_list` (
  `stock_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_id` int(11) NOT NULL,
  `Project_name` varchar(50) NOT NULL,
  `Pro_Date` date NOT NULL,
  `Material_List` varchar(100) NOT NULL,
  `Stock_List` varchar(100) DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`stock_id`),
  KEY `idx_labour_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_labour_branch` (`branch_id`),
  CONSTRAINT `fk_labour_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_labour_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.materials_used
CREATE TABLE IF NOT EXISTS `materials_used` (
  `material_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_id` int(11) NOT NULL,
  `Project_name` varchar(40) NOT NULL,
  `DATE` date NOT NULL,
  `Material_List` varchar(100) NOT NULL,
  `Stock_List` int(11) DEFAULT NULL,
  `Material_Used` int(11) NOT NULL,
  `Created_by` varchar(100) DEFAULT NULL,
  `CREATED_DATETIME` date DEFAULT NULL,
  `LAST_UPDATED_BY` varchar(100) DEFAULT NULL,
  `LAST_UPDATED_DATETIME` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`material_id`),
  KEY `idx_matused_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_matused_branch` (`branch_id`),
  CONSTRAINT `fk_matused_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_matused_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.order_details
CREATE TABLE IF NOT EXISTS `order_details` (
  `Order_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_id` int(11) NOT NULL,
  `Project_name` varchar(40) NOT NULL,
  `Material_Name` varchar(100) NOT NULL,
  `Quantity` double DEFAULT NULL,
  `Unit` varchar(50) DEFAULT NULL,
  `Order_date` date NOT NULL,
  `Delivery_Date` date NOT NULL,
  `Supplier_name` varchar(50) DEFAULT NULL,
  `Supplier_Contact` varchar(20) DEFAULT NULL,
  `Rate` double DEFAULT NULL,
  `Amount` double DEFAULT NULL,
  `Remarks` varchar(200) DEFAULT NULL,
  `Paid` int(11) DEFAULT NULL,
  `Balance` int(11) DEFAULT NULL,
  `Status` varchar(50) DEFAULT NULL,
  `Site_supervisor` varchar(100) DEFAULT NULL,
  `Photos` varchar(255) DEFAULT NULL,
  `Created_by` varchar(100) DEFAULT NULL,
  `CREATED_DATETIME` date DEFAULT NULL,
  `LAST_UPDATED_BY` varchar(100) DEFAULT NULL,
  `LAST_UPDATED_DATETIME` date DEFAULT NULL,
  `Payment_Date` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`Order_id`),
  KEY `idx_order_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_order_branch` (`branch_id`),
  CONSTRAINT `fk_order_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.payment_details
CREATE TABLE IF NOT EXISTS `payment_details` (
  `Payment_id` int(6) DEFAULT NULL,
  `Project_id` int(6) DEFAULT NULL,
  `Payment_date` date DEFAULT NULL,
  `Amount` double DEFAULT NULL,
  `Created_by` varchar(50) DEFAULT NULL,
  `Created_datetime` date DEFAULT NULL,
  `Updated_by` varchar(50) DEFAULT NULL,
  `Updated_datetime` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  KEY `idx_payment_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_payment_branch` (`branch_id`),
  CONSTRAINT `fk_payment_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_payment_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.project_list
CREATE TABLE IF NOT EXISTS `project_list` (
  `Project_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_name` varchar(40) NOT NULL,
  `Project_type` varchar(255) DEFAULT NULL,
  `Project_cost` int(11) NOT NULL DEFAULT 0,
  `Margin` varchar(50) DEFAULT NULL,
  `Project_Estimation_Cost` int(11) DEFAULT NULL,
  `Project_start_date` date NOT NULL,
  `Estimated_end_date` date NOT NULL,
  `Site_location` varchar(255) DEFAULT NULL,
  `Contractor` varchar(40) DEFAULT NULL,
  `Site_supervisor` varchar(40) DEFAULT NULL,
  `Project_status` varchar(30) DEFAULT NULL,
  `Photo` varchar(255) DEFAULT NULL,
  `Created_by` varchar(50) DEFAULT NULL,
  `CREATED_DATETIME` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`Project_id`),
  KEY `idx_project_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_project_branch` (`branch_id`),
  CONSTRAINT `fk_project_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.project_status
CREATE TABLE IF NOT EXISTS `project_status` (
  `Status_id` int(11) NOT NULL AUTO_INCREMENT,
  `Project_Status` varchar(30) DEFAULT NULL,
  `Created_By` varchar(30) DEFAULT NULL,
  `Created_date` date DEFAULT NULL,
  `tenant_id` int(6) unsigned NOT NULL,
  `branch_id` int(6) unsigned NOT NULL,
  PRIMARY KEY (`Status_id`),
  KEY `idx_labour_tenant_branch` (`tenant_id`,`branch_id`),
  KEY `fk_labour_branch` (`branch_id`),
  CONSTRAINT `fk_labour_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_labour_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.tenant
CREATE TABLE IF NOT EXISTS `tenant` (
  `tenant_id` int(6) unsigned NOT NULL AUTO_INCREMENT,
  `tenant_name` varchar(100) NOT NULL,
  `tenant_domain` varchar(255) NOT NULL,
  `tenant_app_name` varchar(150) DEFAULT NULL,
  `tenant_app_logo` varchar(255) DEFAULT NULL,
  `tenant_app_font` varchar(50) DEFAULT NULL,
  `tenant_app_themes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tenant_app_themes`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` varchar(50) DEFAULT 'SYSTEM',
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `updated_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`tenant_id`),
  UNIQUE KEY `uk_tenant_domain` (`tenant_domain`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.user
CREATE TABLE IF NOT EXISTS `user` (
  `User_id` int(30) NOT NULL AUTO_INCREMENT,
  `User_name` varchar(30) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Rights` varchar(30) NOT NULL,
  `Status` varchar(30) NOT NULL,
  `Created_by` varchar(30) DEFAULT NULL,
  `Created_date` date DEFAULT NULL,
  `Updated_by` varchar(30) DEFAULT NULL,
  `Updated_date` date DEFAULT NULL,
  `tenant_id` int(6) unsigned DEFAULT NULL,
  `branch_id` int(6) unsigned DEFAULT NULL,
  `failed_attempt_count` int(11) DEFAULT 0,
  `account_locked` tinyint(1) DEFAULT 0,
  `keycloak_id` varchar(50) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  PRIMARY KEY (`User_id`),
  KEY `idx_users_tenant` (`tenant_id`),
  KEY `idx_users_branch` (`branch_id`),
  KEY `idx_users_tenant_branch` (`tenant_id`,`branch_id`),
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`branch_id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`tenant_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.user_activity
CREATE TABLE IF NOT EXISTS `user_activity` (
  `user_activity_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `browser` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `device` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `login_time` datetime NOT NULL DEFAULT current_timestamp(),
  `logout_time` datetime DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `session_id` char(36) DEFAULT NULL,
  `login_status` varchar(20) DEFAULT 'success',
  `session_source` varchar(20) DEFAULT 'web',
  `country` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `isp_provider` varchar(255) DEFAULT NULL,
  `network_type` varchar(50) DEFAULT NULL,
  `failed_attempt_count` int(11) DEFAULT 0,
  `two_factor_used` enum('Yes','No') DEFAULT 'No',
  `password_changed_recently` tinyint(1) DEFAULT 0,
  `suspicious_flag` enum('Yes','No') DEFAULT 'No',
  `api_calls_count` int(11) DEFAULT 0,
  `logout_reason` varchar(20) DEFAULT NULL,
  `last_activity_time` datetime DEFAULT NULL,
  PRIMARY KEY (`user_activity_id`) USING BTREE,
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_user_activity_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`User_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table dreamhouse.userbranch
CREATE TABLE IF NOT EXISTS `userbranch` (
  `tenant_id` int(6) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_by` varchar(30) NOT NULL DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_by` varchar(30) DEFAULT 'admin',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

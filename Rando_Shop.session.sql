ALTER TABLE `review`
    MODIFY COLUMN `created_at`
        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    MODIFY COLUMN `comment`
        TEXT COLLATE utf8mb4_general_ci NULL,

    ADD COLUMN `updated_at`
        TIMESTAMP NULL DEFAULT NULL
        ON UPDATE CURRENT_TIMESTAMP
        AFTER `created_at`,

    ADD CONSTRAINT `fk_review_product`
        FOREIGN KEY (`product_id`)
        REFERENCES `product` (`id`)
        ON DELETE CASCADE,

    ADD CONSTRAINT `fk_review_client`
        FOREIGN KEY (`account_id`)
        REFERENCES `clients` (`id`)
        ON DELETE CASCADE,

    ADD CONSTRAINT `chk_review_rating`
        CHECK (`rating` BETWEEN 1 AND 5),

    ADD UNIQUE KEY `uq_review_product_account`
        (`product_id`, `account_id`);
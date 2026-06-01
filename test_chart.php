<?php
require 'api/config.php';
$_SESSION['user_id'] = 6;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['month'] = '2026-05'; 
$_GET['action'] = 'chart';
require 'api/transactions.php';

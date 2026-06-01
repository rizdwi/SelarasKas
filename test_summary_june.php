<?php
require 'api/config.php';
$_SESSION['user_id'] = 6;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['month'] = '2026-06'; 
$_GET['action'] = 'summary';
require 'api/transactions.php';

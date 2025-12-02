<?php

if (!function_exists('array_filter_recursive')) {
    function array_filter_recursive($array)
    {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $array[$key] = array_filter_recursive($value);
                if (empty($array[$key])) {
                    unset($array[$key]);
                }
            } elseif ($value === null || $value === '') {
                unset($array[$key]);
            }
        }
        return $array;
    }
}

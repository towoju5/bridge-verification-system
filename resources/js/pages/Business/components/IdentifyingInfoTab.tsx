import React, { useState, useEffect } from "react";
import axios from "axios";


const IDENTIFICATION_TYPES_BY_COUNTRY: Record<string, { type: string; description: string }[]> = {
    "AW": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AF": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AO": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AL": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AD": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AE": [
        { "type": "emirates_id", "description": "National Identity Card" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AR": [
        { "type": "cuil", "description": "Código Único de Identificación Laboral" },
        { "type": "cdi", "description": "Código de Identificación" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AM": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AU": [
        { "type": "tfn", "description": "Tax File Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AT": [
        { "type": "si", "description": "Social Insurance Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "AZ": [
        { "type": "voen", "description": "State Taxpayer Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BE": [
        { "type": "nrn", "description": "National Register Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BD": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BG": [
        { "type": "ucn", "description": "Unified Civil Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BH": [
        { "type": "cpr", "description": "Central Population Registry Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BS": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BA": [
        { "type": "jmbg", "description": "Unique Master Citizen Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BZ": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BM": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BO": [
        { "type": "nit", "description": "Número de Identificación Tributaria" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BR": [
        { "type": "cpf", "description": "Cadastro de Pessoas Físicas" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BB": [
        { "type": "nrn", "description": "National Registration Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "BW": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CA": [
        { "type": "sin", "description": "Social Insurance Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CH": [
        { "type": "avs", "description": "AHV Number" },
        { "type": "ahv", "description": "Old Age and Survivors Insurance Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CL": [
        { "type": "rut", "description": "Registro Único Tributario" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CN": [
        { "type": "ricn", "description": "Resident Identity Card Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CI": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CM": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CO": [
        { "type": "nit", "description": "Número de Identificación Tributaria" },
        { "type": "rut", "description": "Registro Único Tributario" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KM": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CR": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CW": [
        { "type": "crib", "description": "Chamber of Commerce Registration Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CX": [
        { "type": "tfn", "description": "Tax File Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KY": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CY": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "CZ": [
        { "type": "rc", "description": "Residence Code Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "DE": [
        { "type": "steuer_id", "description": "Steueridentifikationsnummer (Tax Identification Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "DM": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "DK": [
        { "type": "cpr", "description": "Central Person Register Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "DO": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "DZ": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "EC": [
        { "type": "ruc", "description": "Registro Único de Contribuyentes" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "EG": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ES": [
        { "type": "nif", "description": "Número de Identificación Fiscal" },
        { "type": "nie", "description": "Número de Identificación de Extranjeros" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "EE": [
        { "type": "ik", "description": "Individual Code" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ET": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "FI": [
        { "type": "hetu", "description": "Finnish Personal Identity Code" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "FJ": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "FR": [
        { "type": "spi", "description": "Social Security Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "GB": [
        { "type": "nino", "description": "National Insurance Number" },
        { "type": "utr", "description": "Unique Taxpayer Reference Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "GE": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "GH": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "GI": [
        { "type": "crc", "description": "Company Registration Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "GR": [
        { "type": "aom", "description": "Αριθμός Μητρώου (Social Security Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "GT": [
        { "type": "nit", "description": "Número de Identificación Tributaria" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "HK": [
        { "type": "hkid", "description": "Hong Kong Identity Card Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "HN": [
        { "type": "rtn", "description": "Registro Tributario Nacional" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "HR": [
        { "type": "oib", "description": "Personal Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "HT": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "HU": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ID": [
        { "type": "npwp", "description": "Nomor Pokok Wajib Pajak" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IM": [
        { "type": "nino", "description": "National Insurance Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IN": [
        { "type": "pan", "description": "Permanent Account Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IE": [
        { "type": "ppsn", "description": "Personal Public Service Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IQ": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IS": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IL": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "IT": [
        { "type": "cf", "description": "Codice Fiscale (Tax Code)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "JM": [
        { "type": "trn", "description": "Taxpayer Registration Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "JO": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "JP": [
        { "type": "mn", "description": "My Number (Individual Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KZ": [
        { "type": "iin", "description": "Individual Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KE": [
        { "type": "pin", "description": "Personal Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KG": [
        { "type": "inn", "description": "Individual Taxpayer Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KH": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KN": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KR": [
        { "type": "rrn", "description": "Resident Registration Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "KW": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LA": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LB": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LR": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LC": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LK": [
        { "type": "nic", "description": "National Identity Card Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LT": [
        { "type": "ak", "description": "Personal Code" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LU": [
        { "type": "matricule", "description": "Matricule Number (Social Security Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "LV": [
        { "type": "pk", "description": "Person’s Code" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MA": [
        { "type": "if", "description": "Identification Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MC": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MD": [
        { "type": "idnp", "description": "Identification Number of the Person" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MG": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MX": [
        { "type": "rfc", "description": "Registro Federal de Contribuyentes" },
        { "type": "curp", "description": "Clave Única de Registro de Población" },
        { "type": "ine", "description": "Instituto Nacional Electoral" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MH": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MK": [
        { "type": "embg", "description": "Unique Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MT": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ME": [
        { "type": "jmbg", "description": "Unique Master Citizen Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MZ": [
        { "type": "nuit", "description": "Número Único de Identificación Tributaria" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MR": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MU": [
        { "type": "nicn", "description": "National Identity Card Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MW": [
        { "type": "tpin", "description": "Taxpayer Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "MY": [
        { "type": "itr", "description": "Income Tax Reference Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NA": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NG": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "nin", "description": "National Identification Number" },
        { "type": "bvn", "description": "Bank Verification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NI": [
        { "type": "ruc", "description": "Registro Único de Contribuyentes" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NL": [
        { "type": "bsn", "description": "Burgerservicenummer (Citizen Service Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NO": [
        { "type": "fn", "description": "Fødselsnummer (Personal Identification Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NP": [
        { "type": "pan", "description": "Permanent Account Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "NZ": [
        { "type": "ird", "description": "Inland Revenue Department Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "OM": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PK": [
        { "type": "ntn", "description": "National Tax Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PA": [
        { "type": "ruc", "description": "Registro Único de Contribuyentes" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PE": [
        { "type": "ruc", "description": "Registro Único de Contribuyentes" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PH": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PL": [
        { "type": "pesel", "description": "Personal Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PR": [
        { "type": "ssn", "description": "Social Security Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PT": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "PY": [
        { "type": "ruc", "description": "Registro Único de Contribuyentes" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "QA": [
        { "type": "qid", "description": "Qatar ID" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "RO": [
        { "type": "cnp", "description": "Cod Numeric Personal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "RW": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SA": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "rp", "description": "Iqama (Residency Permit)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SN": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SG": [
        { "type": "nric", "description": "National Registration Identity Card" },
        { "type": "fin", "description": "Foreign Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SV": [
        { "type": "nit", "description": "Número de Identificación Tributaria" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SO": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "RS": [
        { "type": "jmbg", "description": "Unique Master Citizen Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SR": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SK": [
        { "type": "rc", "description": "Rodné Číslo (Personal Identification Number)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SI": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SE": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "SC": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TC": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TG": [
        { "type": "nif", "description": "Número de Identificação Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TH": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TT": [
        { "type": "bir", "description": "Business Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TN": [
        { "type": "mf", "description": "Matricule Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TR": [
        { "type": "tckn", "description": "Turkish Citizenship Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TW": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "TZ": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "UG": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "UA": [
        { "type": "rnokpp", "description": "Registration Number of the Taxpayer" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "UY": [
        { "type": "rut", "description": "Registro Único Tributario" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "US": [
        { "type": "ssn", "description": "Social Security Number" },
        { "type": "itin", "description": "Individual Taxpayer Identification Number" }
    ],
    "UZ": [
        { "type": "inn", "description": "Individual Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "VC": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "VE": [
        { "type": "rif", "description": "Registro de Información Fiscal" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "VG": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "VN": [
        { "type": "mst", "description": "Mã Số Thuế (Tax Code)" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "VU": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "WS": [
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "YE": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ZA": [
        { "type": "itr", "description": "Income Tax Reference Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ZM": [
        { "type": "tpin", "description": "Taxpayer Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ],
    "ZW": [
        { "type": "tin", "description": "Tax Identification Number" },
        { "type": "passport", "description": "Passport" },
        { "type": "national_id", "description": "National ID" },
        { "type": "other", "description": "Other Government Issued ID" }
    ]
};
// Helper: Get available types for a country; fallback to generic if not found
const getIdTypesForCountry = (countryCode: string) => {
    return IDENTIFICATION_TYPES_BY_COUNTRY[countryCode] || [
        { type: "passport", description: "Passport" },
        { type: "national_id", description: "National ID" },
        { type: "other", description: "Other Government Issued ID" },
    ];
};

interface Country {
    code: string;
    name: string;
}

interface Props {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    saving: boolean;
    countries?: Country[];
    goToStep: (step: string) => void;
    showError: (msg: string) => void;
}

export default function IdentifyingInfoTab({
    formData,
    setFormData,
    saving,
    countries = [],
    goToStep,
    showError,
}: Props) {
    const [list, setList] = useState<any[]>(
        formData.identifying_information?.length
            ? formData.identifying_information
            : [
                {
                    type: "",
                    issuing_country: "",
                    number: "",
                    expiration: "",
                    description: "",
                },
            ]
    );

    const [errors, setErrors] = useState<Record<string, string>>({});

    const addItem = () => {
        setList((prev) => [
            ...prev,
            {
                type: "",
                issuing_country: "",
                number: "",
                expiration: "",
                description: "",
            },
        ]);
    };

    const removeItem = (idx: number) => {
        if (list.length === 1) {
            showError("At least one identification record is required.");
            return;
        }
        setList((prev) => prev.filter((_, i) => i !== idx));
    };

    const update = (idx: number, field: string, value: any) => {
        setList((prev) =>
            prev.map((item, index) =>
                index === idx ? { ...item, [field]: value } : item
            )
        );

        // Clear field-specific error on change
        if (errors[`list.${idx}.${field}`]) {
            setErrors((prev) => ({
                ...prev,
                [`list.${idx}.${field}`]: "",
            }));
        }

        // If issuing_country changes, auto-clear type if invalid for new country
        if (field === "issuing_country" && value) {
            const validTypes = getIdTypesForCountry(value).map((t) => t.type);
            setList((prev) =>
                prev.map((item, i) =>
                    i === idx && !validTypes.includes(item.type)
                        ? { ...item, type: "" }
                        : item
                )
            );
        }
    };

    const validate = () => {
        const e: Record<string, string> = {};

        list.forEach((item, idx) => {
            if (!item.type.trim()) e[`list.${idx}.type`] = "Type is required.";
            if (!item.issuing_country.trim())
                e[`list.${idx}.issuing_country`] = "Issuing country is required.";
            if (!item.number.trim())
                e[`list.${idx}.number`] = "Identification number is required.";
            if (!item.expiration.trim())
                e[`list.${idx}.expiration`] = "Expiration date is required.";
        });

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Identifying Information
            </h2>

            {list.map((item, idx) => {
                const idTypes = getIdTypesForCountry(item.issuing_country);

                return (
                    <div
                        key={idx}
                        className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white">
                                ID #{idx + 1}
                            </h3>

                            {list.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            {/* Type — now a dropdown */}
                            <div>
                                <label className="block text-sm font-medium">
                                    Type *
                                </label>
                                {item.issuing_country ? (
                                    <select
                                        value={item.type}
                                        onChange={(e) =>
                                            update(idx, "type", e.target.value)
                                        }
                                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`list.${idx}.type`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                            }`}
                                    >
                                        <option value="">Select Type</option>
                                        {idTypes.map((idType) => (
                                            <option
                                                key={idType.type}
                                                value={idType.type}
                                            >
                                                {idType.description}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={item.type}
                                        onChange={(e) =>
                                            update(idx, "type", e.target.value)
                                        }
                                        placeholder="Select country first"
                                        disabled
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500"
                                    />
                                )}
                                {errors[`list.${idx}.type`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`list.${idx}.type`]}
                                    </p>
                                )}
                            </div>

                            {/* Issuing Country */}
                            <div>
                                <label className="block text-sm font-medium">
                                    Issuing Country *
                                </label>

                                {countries.length ? (
                                    <select
                                        value={item.issuing_country}
                                        onChange={(e) =>
                                            update(
                                                idx,
                                                "issuing_country",
                                                e.target.value
                                            )
                                        }
                                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`list.${idx}.issuing_country`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                            }`}
                                    >
                                        <option value="">Select Country</option>
                                        {countries.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={item.issuing_country}
                                        onChange={(e) =>
                                            update(
                                                idx,
                                                "issuing_country",
                                                e.target.value
                                            )
                                        }
                                        placeholder="US"
                                        className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`list.${idx}.issuing_country`]
                                            ? "border-red-300"
                                            : "border-gray-300"
                                            }`}
                                    />
                                )}

                                {errors[`list.${idx}.issuing_country`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`list.${idx}.issuing_country`]}
                                    </p>
                                )}
                            </div>

                            {/* Number */}
                            <div>
                                <label className="block text-sm font-medium">
                                    Identification Number *
                                </label>
                                <input
                                    value={item.number}
                                    onChange={(e) =>
                                        update(idx, "number", e.target.value)
                                    }
                                    placeholder="Enter ID number"
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`list.${idx}.number`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                        }`}
                                />
                                {errors[`list.${idx}.number`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`list.${idx}.number`]}
                                    </p>
                                )}
                            </div>

                            {/* Expiration */}
                            <div>
                                <label className="block text-sm font-medium">
                                    Expiration Date *
                                </label>
                                <input
                                    type="date"
                                    value={item.expiration}
                                    onChange={(e) =>
                                        update(idx, "expiration", e.target.value)
                                    }
                                    className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 dark:text-white dark:bg-gray-600 ${errors[`list.${idx}.expiration`]
                                        ? "border-red-300"
                                        : "border-gray-300"
                                        }`}
                                />
                                {errors[`list.${idx}.expiration`] && (
                                    <p className="text-sm text-red-600">
                                        {errors[`list.${idx}.expiration`]}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium">
                                    Description
                                </label>
                                <textarea
                                    rows={2}
                                    value={item.description}
                                    onChange={(e) =>
                                        update(idx, "description", e.target.value)
                                    }
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                                />
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-start mb-6">
                <button
                    type="button"
                    onClick={addItem}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                >
                    + Add Another Identification
                </button>
            </div>

            <div className="mt-10 flex justify-between">
                <button
                    onClick={() => goToStep("documents")}
                    disabled={saving}
                    className="inline-flex items-center px-6 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white hover:bg-gray-50"
                >
                    Previous
                </button>

                <button
                    onClick={async () => {
                        if (!validate()) return;

                        try {
                            const payload = {
                                identifying_information: list,
                            };

                            await axios.post(
                                "/api/business-customer/step/7",
                                payload
                            );

                            setFormData((prev: any) => ({
                                ...prev,
                                identifying_information: list,
                            }));

                            goToStep("extra_documents");
                        } catch (err: any) {
                            console.error(err);
                            showError(
                                err.response?.data?.message ||
                                "Unable to save identifying information."
                            );
                        }
                    }}
                    disabled={saving}
                    className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${saving
                        ? "bg-gray-400"
                        : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                >
                    {saving ? "Saving..." : "Next"}
                </button>
            </div>
        </div>
    );
}
import React, { useState } from "react";
import axios from "axios";

/* ======================================================
 | IDENTIFICATION TYPES BY COUNTRY
 ====================================================== */
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

const getIdTypesForCountry = (countryCode: string) =>
    IDENTIFICATION_TYPES_BY_COUNTRY[countryCode] || [
        { type: "passport", description: "Passport" },
        { type: "national_id", description: "National ID" },
        { type: "other", description: "Other Government Issued ID" },
    ];

/* ======================================================
 | TYPES
 ====================================================== */
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

/* ======================================================
 | EMPTY PERSON TEMPLATE
 ====================================================== */
const emptyPerson = {
    first_name: "",
    last_name: "",
    birth_date: "",
    nationality: "",
    email: "",
    phone: "",
    title: "",
    ownership_percentage: "",
    relationship_established_at: "",

    has_ownership: false,
    has_control: false,
    is_signer: false,
    is_director: false,

    residential_address: {
        street_line_1: "",
        street_line_2: "",
        city: "",
        subdivision: "",
        postal_code: "",
        country: "",
    },

    identifying_information: [
        {
            type: "",
            issuing_country: "",
            number: "",
            expiration: "",
            description: "",
        },
    ],
};

/* ======================================================
 | COMPONENT
 ====================================================== */
export default function AssociatedPersons({
    formData,
    setFormData,
    saving,
    countries = [],
    goToStep,
    showError,
}: Props) {
    const [persons, setPersons] = useState<any[]>(
        formData.associated_persons?.length
            ? formData.associated_persons
            : [structuredClone(emptyPerson)]
    );

    /* ======================================================
     | PERSON HANDLERS
     ====================================================== */
    const addPerson = () =>
        setPersons((prev) => [...prev, structuredClone(emptyPerson)]);

    const removePerson = (idx: number) => {
        if (persons.length === 1) {
            showError("At least one associated person is required.");
            return;
        }
        setPersons((prev) => prev.filter((_, i) => i !== idx));
    };

    const updatePerson = (idx: number, field: string, value: any) =>
        setPersons((prev) =>
            prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
        );

    const updateAddress = (idx: number, field: string, value: any) =>
        setPersons((prev) =>
            prev.map((p, i) =>
                i === idx
                    ? {
                        ...p,
                        residential_address: {
                            ...p.residential_address,
                            [field]: value,
                        },
                    }
                    : p
            )
        );

    /* ======================================================
     | IDENTIFYING INFORMATION HANDLERS
     ====================================================== */
    const addIdentity = (pIdx: number) =>
        setPersons((prev) =>
            prev.map((p, i) =>
                i === pIdx
                    ? {
                        ...p,
                        identifying_information: [
                            ...p.identifying_information,
                            {
                                type: "",
                                issuing_country: "",
                                number: "",
                                expiration: "",
                                description: "",
                            },
                        ],
                    }
                    : p
            )
        );

    const removeIdentity = (pIdx: number, idIdx: number) =>
        setPersons((prev) =>
            prev.map((p, i) =>
                i === pIdx
                    ? {
                        ...p,
                        identifying_information:
                            p.identifying_information.length === 1
                                ? p.identifying_information
                                : p.identifying_information.filter(
                                    (_: any, j: number) => j !== idIdx
                                ),
                    }
                    : p
            )
        );

    const updateIdentity = (
        pIdx: number,
        idIdx: number,
        field: string,
        value: any
    ) =>
        setPersons((prev) =>
            prev.map((p, i) =>
                i === pIdx
                    ? {
                        ...p,
                        identifying_information: p.identifying_information.map(
                            (id: any, j: number) =>
                                j === idIdx ? { ...id, [field]: value } : id
                        ),
                    }
                    : p
            )
        );

    /* ======================================================
     | SUBMIT
     ====================================================== */
    const submit = async () => {
        try {
            const payload = { associated_persons: persons };

            await axios.post("/api/business-customer/step/3", payload);

            setFormData((prev: any) => ({
                ...prev,
                associated_persons: persons,
            }));

            goToStep("financial");
        } catch (err: any) {
            showError(
                err.response?.data?.message ||
                "Unable to save associated persons."
            );
        }
    };

    /* ======================================================
     | RENDER
     ====================================================== */
    return (
        <div className="dark:bg-gray-800 bg-white shadow-xl sm:rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">
                Associated Persons
            </h2>

            {persons.map((person, idx) => (
                <div
                    key={idx}
                    className="border rounded-lg p-6 mb-10 bg-gray-50 dark:bg-gray-900"
                >
                    {/* PERSON HEADER */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium">
                            Associated Person #{idx + 1}
                        </h3>

                        {persons.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removePerson(idx)}
                                className="text-sm text-red-600"
                            >
                                Remove Person
                            </button>
                        )}
                    </div>

                    {/* BIO DATA */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {[
                            ["first_name", "First Name"],
                            ["last_name", "Last Name"],
                            ["email", "Email"],
                            ["phone", "Phone"],
                            ["title", "Title / Role"],
                        ].map(([field, label]) => (
                            <div key={field}>
                                <label className="text-sm font-medium">{label}</label>
                                <input
                                    value={person[field]}
                                    onChange={(e) =>
                                        updatePerson(idx, field, e.target.value)
                                    }
                                    className="border p-2 rounded w-full"
                                />
                            </div>
                        ))}

                        <div>
                            <label className="text-sm font-medium">Birth Date</label>
                            <input
                                type="date"
                                value={person.birth_date}
                                onChange={(e) =>
                                    updatePerson(idx, "birth_date", e.target.value)
                                }
                                className="border p-2 rounded w-full"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Nationality</label>
                            <select
                                value={person.nationality}
                                onChange={(e) =>
                                    updatePerson(idx, "nationality", e.target.value)
                                }
                                className="border p-2 rounded w-full"
                            >
                                <option value="">Select</option>
                                {countries.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Ownership Percentage
                            </label>
                            <input
                                type="number"
                                value={person.ownership_percentage}
                                onChange={(e) =>
                                    updatePerson(
                                        idx,
                                        "ownership_percentage",
                                        e.target.value
                                    )
                                }
                                className="border p-2 rounded w-full"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Relationship Established At
                            </label>
                            <input
                                type="date"
                                value={person.relationship_established_at}
                                onChange={(e) =>
                                    updatePerson(
                                        idx,
                                        "relationship_established_at",
                                        e.target.value
                                    )
                                }
                                className="border p-2 rounded w-full"
                            />
                        </div>
                    </div>

                    {/* FLAGS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                        {[
                            ["has_ownership", "Has Ownership"],
                            ["has_control", "Has Control"],
                            ["is_signer", "Is Signer"],
                            ["is_director", "Is Director"],
                        ].map(([field, label]) => (
                            <label
                                key={field}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={person[field]}
                                    onChange={(e) =>
                                        updatePerson(idx, field, e.target.checked)
                                    }
                                />
                                {label}
                            </label>
                        ))}
                    </div>

                    {/* RESIDENTIAL ADDRESS */}
                    <div className="mt-8">
                        <h4 className="font-semibold mb-4">
                            Residential Address
                        </h4>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                ["street_line_1", "Street Line 1"],
                                ["street_line_2", "Street Line 2"],
                                ["city", "City"],
                                ["subdivision", "State / Province"],
                                ["postal_code", "Postal Code"],
                            ].map(([field, label]) => (
                                <div key={field}>
                                    <label className="text-sm font-medium">{label}</label>
                                    <input
                                        value={person.residential_address[field]}
                                        onChange={(e) =>
                                            updateAddress(idx, field, e.target.value)
                                        }
                                        className="border p-2 rounded w-full"
                                    />
                                </div>
                            ))}

                            <div>
                                <label className="text-sm font-medium">Country</label>
                                <select
                                    value={person.residential_address.country}
                                    onChange={(e) =>
                                        updateAddress(idx, "country", e.target.value)
                                    }
                                    className="border p-2 rounded w-full"
                                >
                                    <option value="">Select</option>
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* IDENTIFYING INFORMATION */}
                    <div className="mt-8">
                        <h4 className="font-semibold mb-4">
                            Identifying Information
                        </h4>

                        {person.identifying_information.map(
                            (id: any, idIdx: number) => {
                                const idTypes = getIdTypesForCountry(
                                    id.issuing_country
                                );

                                return (
                                    <div
                                        key={idIdx}
                                        className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-800"
                                    >
                                        <div className="flex justify-between mb-3">
                                            <span className="text-sm font-medium">
                                                ID #{idIdx + 1}
                                            </span>

                                            {person.identifying_information.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeIdentity(idx, idIdx)
                                                    }
                                                    className="text-sm text-red-600"
                                                >
                                                    Remove ID
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">
                                                    Issuing Country
                                                </label>
                                                <select
                                                    value={id.issuing_country}
                                                    onChange={(e) =>
                                                        updateIdentity(
                                                            idx,
                                                            idIdx,
                                                            "issuing_country",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border p-2 rounded w-full"
                                                >
                                                    <option value="">Select</option>
                                                    {countries.map((c) => (
                                                        <option key={c.code} value={c.code}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium">
                                                    ID Type
                                                </label>
                                                <select
                                                    value={id.type}
                                                    onChange={(e) =>
                                                        updateIdentity(
                                                            idx,
                                                            idIdx,
                                                            "type",
                                                            e.target.value
                                                        )
                                                    }
                                                    disabled={!id.issuing_country}
                                                    className="border p-2 rounded w-full"
                                                >
                                                    <option value="">Select</option>
                                                    {idTypes.map((t) => (
                                                        <option key={t.type} value={t.type}>
                                                            {t.description}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium">
                                                    Identification Number
                                                </label>
                                                <input
                                                    value={id.number}
                                                    onChange={(e) =>
                                                        updateIdentity(
                                                            idx,
                                                            idIdx,
                                                            "number",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border p-2 rounded w-full"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium">
                                                    Expiration Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={id.expiration}
                                                    onChange={(e) =>
                                                        updateIdentity(
                                                            idx,
                                                            idIdx,
                                                            "expiration",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border p-2 rounded w-full"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="text-sm font-medium">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={id.description}
                                                    onChange={(e) =>
                                                        updateIdentity(
                                                            idx,
                                                            idIdx,
                                                            "description",
                                                            e.target.value
                                                        )
                                                    }
                                                    className="border p-2 rounded w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}

                        <button
                            type="button"
                            onClick={() => addIdentity(idx)}
                            className="text-indigo-600 text-sm hover:underline"
                        >
                            + Add another ID
                        </button>
                    </div>
                </div>
            ))}

            {/* ADD PERSON */}
            <button
                type="button"
                onClick={addPerson}
                className="mb-8 text-indigo-600 text-sm hover:underline"
            >
                + Add another associated person
            </button>

            {/* ACTIONS */}
            <div className="flex justify-between">
                <button
                    onClick={() => goToStep("addresses")}
                    className="px-6 py-2 border rounded"
                >
                    Previous
                </button>

                <button
                    onClick={submit}
                    disabled={saving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded"
                >
                    {saving ? "Saving..." : "Next"}
                </button>
            </div>
        </div>
    );
}

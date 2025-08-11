<?php

namespace app\Services;

class TransliterationService
{
    public function needsTransliteration(string $text): array
    {
        // Step 1: Check if the string contains any character outside Latin-1 Supplement and basic allowed range
        // This regex matches only allowed characters:
        // - Basic ASCII letters (A-Za-z)
        // - Latin-1 accented characters (À-ÖØ-ÿ)
        // - Space, hyphen, apostrophe
        $isPureLatin = (bool) preg_match('/^[\p{L}\s\-\'\.]+$/u', $text) &&
            ! preg_match('/[^\x00-\x7F\x80-\xFF\s\-\'\.]/u', $text);

        $transliterated = $text;

        // Step 2: Transliterate only if needed or to clean up
        if (class_exists(\Transliterator::class)) {
            // Use Intl Transliterator (best accuracy)
            $trans          = \Transliterator::create('Any-Latin; Latin-ASCII');
            $transliterated = $trans->transliterate($text);
        } else {
            // Fallback manual mapping (basic)
            $map = [
                '/[ÀÁÂÃÄÅǺĀĂĄ]/u' => 'A',
                '/[àáâãäåǻāăą]/u' => 'a',
                '/[ÆǼ]/u'         => 'AE',
                '/æǽ/'            => 'ae',
                '/[ÇĆĈĊČ]/u'      => 'C',
                '/[çćĉċč]/u'      => 'c',
                '/[ÐĎĐ]/u'        => 'D',
                '/[ðďđ]/u'        => 'd',
                '/[ÈÉÊËĒĔĖĘĚ]/u'  => 'E',
                '/[èéêëēĕėęě]/u'  => 'e',
                '/[ĜĞĠĢ]/u'       => 'G',
                '/[ĝğġģ]/u'       => 'g',
                '/[ĤĦ]/u'         => 'H',
                '/[ĥħ]/u'         => 'h',
                '/[ÌÍÎÏĨĪĬĮİ]/u'  => 'I',
                '/[ìíîïĩīĭįı]/u'  => 'i',
                '/[Ĵ]/u'          => 'J',
                '/[ĵ]/u'          => 'j',
                '/[Ķ]/u'          => 'K',
                '/[ķ]/u'          => 'k',
                '/[ŁĽĿ]/u'        => 'L',
                '/[łľŀ]/u'        => 'l',
                '/[ÑŃŅŇ]/u'       => 'N',
                '/[ñńņň]/u'       => 'n',
                '/[ÒÓÔÕÖØŌŎŐ]/u'  => 'O',
                '/[òóôõöøōŏő]/u'  => 'o',
                '/[ŔŖŘ]/u'        => 'R',
                '/[ŕŗř]/u'        => 'r',
                '/[ŚŜŞŠ]/u'       => 'S',
                '/[śŝşš]/u'       => 's',
                '/[ŢŤŦ]/u'        => 'T',
                '/[ţťŧ]/u'        => 't',
                '/[ÙÚÛÜŨŪŬŮŰŲ]/u' => 'U',
                '/[ùúûüũūŭůűų]/u' => 'u',
                '/[Ŵ]/u'          => 'W',
                '/[ŵ]/u'          => 'w',
                '/[ÝŶŸ]/u'        => 'Y',
                '/[ýÿŷ]/u'        => 'y',
                '/[Þ]/u'          => 'TH',
                '/[þ]/u'          => 'th',
                '/[ß]/u'          => 'ss',
                // Handle ligatures
                '/[Ä]/u'          => 'Ae',
                '/[ä]/u'          => 'ae',
                '/[Ö]/u'          => 'Oe',
                '/[ö]/u'          => 'oe',
                '/[Ü]/u'          => 'Ue',
                '/[ü]/u'          => 'ue',
            ];
            $transliterated = $text;
            foreach ($map as $pattern => $replacement) {
                $transliterated = preg_replace($pattern, $replacement, $transliterated);
            }
        }

        // Step 3: Final cleanup — keep only allowed characters (A-Za-z, space, hyphen, apostrophe)
        $transliterated = preg_replace('/[^A-Za-z\s\-\'\x80-\xFF]/u', '', $transliterated);
        $transliterated = trim(preg_replace('/\s+/', ' ', $transliterated));

        // Ensure not empty
        $transliterated = $transliterated ?: $text;

        // Transliteration is required if original contains non-Latin characters
        $requiresTransliteration = ! $isPureLatin;

        return [
            'requires_transliteration' => $requiresTransliteration,
            'transliterated'           => $transliterated,
        ];
    }
}

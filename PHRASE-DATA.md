# Öbek verisi

`phrases.js`, [Open English WordNet 2025](https://en-word.net/static/english-wordnet-2025.xml.gz) içindeki fiil ifadelerinden `scripts/build-phrases.py` ile türetilmiştir. Kaynak eser Open English Wordnet Community tarafından [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) lisansıyla yayımlanır.

Liste yalnızca öbek **adayı** bulur. İngilizce anlamları veya Türkçe çevirileri içermez. Fiil dışı ifadeler, dört kelimeden uzun ifadeler ve ikinci sözcüğü yaygın bir parçacık/edat olmayan ifadeler dışlanır. Bazı adaylar cümlede düz anlamda kullanılabilir; bu nedenle otomatik kaydedilmez.

`expressions.js` içindeki kalıp ifadeler (`in spite of`, `as well as` vb.) proje için elle hazırlanmıştır; WordNet'ten gelmez ve yalnızca yazıldığı biçimle eşleşir.

Yeniden üretim:

```text
python scripts/build-phrases.py english-wordnet-2025.xml.gz phrases.js
```

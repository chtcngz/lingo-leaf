# LingoLeaf 0.9.0

İngilizce okurken kelime ve ifadelerini yönet. Türkçe arayüz, yerel kayıt, renklendirme ve seçim kartında Türkçe çeviri.

## Önceki sürümü güncelle

1. Eski eklentide Ayarlar → Yedek indir ile kelimelerini yedekle.
2. ZIP'i geçici bir klasöre çıkar.
3. Yeni LingoLeaf klasörünün içindekileri, Chrome'a daha önce yüklediğin **aynı LingoLeaf klasörünün içine** kopyala; dosyaları değiştir.
4. `chrome://extensions` sayfasında mevcut LingoLeaf kartındaki yenile simgesine bas.
5. Açık web sayfalarını ve yan paneli yenile.

**Eklentiyi kaldırma.** Aynı klasörden güncellemek kayıtlarını korur. Farklı klasörden yeni eklenti olarak yüklersen eski kayıtlar görünmeyebilir; JSON yedeğini Ayarlar → Yedek yükle ile içe aktarabilirsin.

## İlk kez yükle

1. ZIP'i çıkar.
2. Chrome'da `chrome://extensions` sayfasını aç.
3. Geliştirici modunu aç → Paketlenmemiş öğe yükle.
4. İçinde `manifest.json` bulunan LingoLeaf klasörünü seç.
5. Eklentiyi sabitle ve açık İngilizce sayfalarını yenile.

Masaüstü Chrome 120 veya daha yeni sürüm gerekir.

Seçim kartındaki yerel çeviri için masaüstü Chrome 138 veya daha yeni sürüm gerekir. İlk çeviride Chrome İngilizce–Türkçe dil paketini indirebilir; kart indirme durumunu gösterir. Çeviri tarayıcıda yapılır, seçilen metin harici bir çeviri servisine gönderilmez.

## Chrome'lar arası senkron

Ayarlar → **Chrome senkronu** açıkken (varsayılan), aynı Google hesabıyla oturum açtığın Chrome'larda (ör. iş ve ev bilgisayarı) kelimelerin eşitlenir. Bunun için Chrome ayarlarında senkron açık olmalı ve senkronize edilenler arasında **Uzantılar** bulunmalı. Eklenti her bilgisayarda aynı kimlikle yüklü olmalı: Web Store'dan kurulan sürümde bu kendiliğinden olur; paketlenmemiş klasörden yüklendiğinde Chrome kimliği klasör yolundan türetir, yani iş ve ev bilgisayarında klasör yolu birebir aynı değilse eşitleme olmaz. Bunu `manifest.json`'a iki bilgisayarda da aynı `key` alanını ekleyerek sabitleyebilirsin; ama `key` eklemek mevcut kurulumun kimliğini değiştirir ve kayıtlar yeni kimlikte görünmez, bu yüzden önce **Yedek indir** ile JSON yedeği alıp sonra **Yedek yükle** ile geri yükle.

- Eşitlenenler: kelime/ifade, durum, eklenme ve ilk öğrenme tarihi, Türkçe karşılık ve kaldırılan kelimeler.
- Bu cihazda kalanlar: notlar, örnek cümleler, kaynak bağlantıları, ayarlar, okuma süresi ve geçmiş.
- Aynı kelime iki yerde değiştiyse en son yapılan değişiklik geçerli olur.
- Chrome senkron alanı yaklaşık 100 KB'tır: Türkçe karşılıklarla yaklaşık 2.000, karşılıksız yaklaşık 2.900 kelime sığar. Yer azalınca önce karşılıklar eşitlenmez; alan dolarsa ayarlarda uyarı çıkar ve JSON yedeğiyle taşıyabilirsin.
- Edge'de de aynı şekilde Microsoft hesabıyla Edge'ler arasında çalışır; Chrome ile Edge arasında eşitleme yoktur.

## Okurken

- İngilizce kelimelerin **metin rengi** değişir; alt çizgi yoktur.
- Bilinmeyen: mor; öğreniyorum: sıcak ton; öğrendim: yeşil; biliyorum: özgün renk.
- Kelime seçip durum düğmesine bas. Daha uzun metin seçip **Kelimeleri yönet** ile hangi kelimeleri ekleyeceğini belirle. Panelde yeni kelimeler üstte; kayıtlı olanlar Öğreniyorum/Öğrendim gruplarında, bildiklerin en altta kapalı durur. Kaydettikten sonra seçim temizlenir, böylece sonraki kayıt öncekileri değiştirmez.
- Metin seçildiğinde açılan kartta Türkçe çeviri otomatik görünür. Çeviri başarısız olursa karttan tekrar deneyebilirsin.
- Tek kelime seçtiğinde geçtiği cümlenin Türkçe çevirisi de gösterilir. Bu çeviri kelimenin bağlamını anlamaya yardım eder; ayrı bir sözlük anlamı değildir.
- `give up` gibi fiil öbekleri seçimin çevresinde aranır. `gave up` ve `gave it up` gibi biçimler önerilebilir; öbeği **Öğreniyorum olarak ekle** ile kendin kaydedersin. Öneriler yanılabilir.
- Öbeğin tamamını seçtiğinde (`broke down`, `gave it up`) kart, panel ve sağ tık menüsü onu tek öğe olarak temel biçimiyle (`break down`, `give up`) çıkarır; öbeğin kelimeleri ayrıca listelenmez. Kayıtlı öbekler paket adaylarından önce gelir.
- `in spite of`, `as well as`, `of course` gibi kalıp ifadeler de yalnızca bu yazılışlarıyla tek öğe olarak çıkarılır.
- Panelde yanlış birleşen bir öbeği (ör. `looked up the street` içindeki `look up`) **böl** ile ayrı kelimelere ayırabilirsin. Kayıtlı öbekler bölünmez.
- Sağ tık veya **Alt+Shift+L** ile panele geç. Kısayol çakışırsa `chrome://extensions/shortcuts` adresinden değiştir.
- Aynı kelime tekrar eklenmez. Listeye kayıtlı kelimelerin mevcut durumu görünür.
- Kelimelerim listesinde her kaydın altında **Türkçe karşılığı** görünür. Karttan kaydettiğin kelimenin karşılığı kayıtla birlikte saklanır; eksik olanları panel Chrome'un yerel çevirisiyle tamamlar. Dil paketi henüz inmemişse panel bir kez **Paketi indir ve çevir** düğmesini gösterir. Karşılığı kelime ayrıntısından düzeltebilir veya kendin yazabilirsin; aramada Türkçe karşılık da aranır. Bu, kelimenin tek başına çevirisidir; bağlama göre anlamı farklı olabilir.
- Kelimelerim listesinde açık sayfada geçen kayıtların yanında **Sayfada** düğmesi çıkar. Satırın üstüne gelince kelime sayfada sarı zeminle işaretlenir; düğmeye her tıklamada sıradaki geçtiği yere kaydırır ve turuncuyla gösterir (`2 / 5`).
- Kaydettiğin çok kelimeli ifadeler aynı paragrafta, kelimeler inline öğelerle ayrılmış olsa da renklendirilir. Uzun ifade önceliklidir.
- Kişi, yer ve kurum adları (Netanyahu, Gaza Strip, NATO) renklendirilmez; panelde **Özel adlar** grubunda kapalı durur. Cümle ortasında büyük harfle başlayan kelimeler ve kısa büyük harfli kısaltmalar ad sayılır. Cümle başındaki veya Başlık Biçimindeki bir kelime, sayfada başka yerde ad olarak geçip hiç küçük harfle geçmiyorsa ad sayılır; kanıt yoksa renklendirilir. Kaydettiğin kelimeler her zaman renklenir. Ayarlar'daki **Özel adları atla** ile kapatılabilir.
- Biliyorum kelimeleri ve ifadeleri renklendirilmez. Çekimler ayrı kayıttır.

## Kelime yönetimi

- **Kelime ekle:** Metin yapıştır → kelimeleri seç → durum belirle → kaydet. Başlangıçta bildiğin kelimeleri bu yolla topluca ekleyebilirsin.
- **Kelimelerim:** Ara, filtrele, sırala, görünenleri seç ve topluca durum değiştir/kaldır.
- Kelime adına bas: not, örnek cümle, kaynak ve ilk öğrenme tarihini aç. **Unuttum**, kelimeyi öğreniyorum durumuna taşır.
- Son işlem mesajındaki **Geri al** 12 saniye görünür; kaldırılan kaydın bütün alanlarını geri getirir. Daha sonra başka işlemle değişen kayıtların üzerine yazmaz.
- Aynı metin yeniden seçilirse durum güncellenir; ikinci kayıt oluşmaz.

## Görünüm ve dil

Ayarlar'dan renkleri, hafif/normal/belirgin ayarını, temayı ve günlük hedefi değiştir. Renkler sabit değildir: her metin için zemin, yazı rengi ve yazı boyutuna göre yeniden hesaplanır. Durumun tonu korunur, doygunluk belirgin tutulur ve açıklık okunurluk sınırına (normal metinde en az 4.5:1, büyük başlıkta 3:1, ince küçük yazıda 5.5:1, koyu zeminde biraz daha fazla) göre ayarlanır. Normal ve Belirgin seviyeler kelimenin arkasına hafif bir zemin de ekler; Ayarlar'daki önizleme açık ve koyu zemindeki sonucu gösterir. Görsel veya degradeli zeminlerde özgün renk korunur. Genel bakış → Bu sayfada alanından otomatik algılamayı elle düzeltebilir veya siteyi duraklatabilirsin.

Dil etiketleri ve yeterince uzun paragraflarda Chrome dil algılama kullanılır. Çok kısa veya karma metinlerde kesinlik garanti edilmez. İngilizce olmayan açık dil etiketleri dışlanır; siteyi elle etkinleştirmek bu dil sınırlamasını kaldırır.

## İstatistikler

Günlük hedef, ilk kez öğrendiğin benzersiz kelimelerin 7/30/90 günlük grafiği, durum toplamları, aktif gün serisi ve son yedi günlük yaklaşık aktif okuma süresi gösterilir. Öğrendim → öğreniyorum → öğrendim geçişi ilk öğrenme sayısını artırmaz. Okuma süresi yalnızca sekme odaktayken, İngilizce içerik varken ve son 90 saniyede etkileşim olduğunda 30 saniyelik aralıklarla sayılır; tam okuma ölçümü değildir. Sayfadaki bildiğin kelime oranı bir dil seviyesi puanı değildir.

## Yedekleme ve başlangıç listeleri

- JSON yedeği: kelimeler ve ayarların bir kopyası. İçe aktarma **yalnızca kelimeleri** birleştirir; mevcut kayıtları, ayarları ve okuma geçmişini değiştirmez.
- TXT: her satıra bir kelime veya ifade yaz. Ayarlar'dan varsayılan durumunu seç.
- CSV: virgül veya noktalı virgül ayracı; başlıklar `word,status,note,example,url,createdAt,learnedAt`. Türkçe `kelime,durum,not,örnek,kaynak` başlıkları da desteklenir. Başlıksız dosyada ilk sütun kelime, ikinci sütun isteğe bağlı durumdur.
- Durumlar `known`, `learning`, `learned` veya `biliyorum`, `öğreniyorum`, `öğrendim` olabilir.
- Mevcut/geçersiz kayıtlar atlanır; kaç kaydın eklendiği ve atlandığı gösterilir. İçe aktarma da geri alınabilir.
- JSON yedekler 0.1.0 ile uyumludur. Kaldırmadan önce mutlaka yedek al.

## Veri ve sınırlar

Kelimeler, notlar, kaynak bağlantıları, durum değişiklikleri ve günlük toplam aktif okuma süreleri yalnızca bu Chrome profilinde tutulur. Sunucu ve analitik isteği yoktur. Seçim, cümle ve öbek çevirisi Chrome'un yerel Translator API'si, dil algılama yerel i18n API'si ile yapılır. Çeviriler en fazla 100 metin için geçici bellek önbelleğinde tutulur; sayfa yenilenince silinir. Öbek adayları eklentiyle gelen [Open English WordNet](PHRASE-DATA.md) verisinden ve proje içinde hazırlanan kalıp ifade listesinden bulunur. Eklentinin sayfalara erişimi otomatik renklendirme ve seçim kartı içindir. Eklentiyi kaldırmak kayıtları siler.

Chrome iç sayfaları, Web Store, yerleşik PDF, çerçeveler ve Shadow DOM metinleri kapsam dışı. Büyük sayfalarda kısmi tarama yapılabilir. Tarayıcı testleri ayrı Chrome oturumunda API taklitleriyle yürütüldü; gerçek yükleme izinleri ve tüm siteler için doğrulama tamamlanmış değildir.

Derleme gerektirmez. Kaynak kodları bu klasörde. Ayrıntılı plan: [ROADMAP.md](ROADMAP.md). Doğrulama: [TEST-NOTES.md](TEST-NOTES.md).

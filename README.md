# LingoLeaf 0.10.0

İngilizce okurken kelime ve ifadelerini yönet. Türkçe arayüz, yerel kayıt, renklendirme ve seçim kartında Türkçe çeviri.

## Önceki sürümü güncelle

1. Eski eklentide Ayarlar → Yedek indir ile kelimelerini yedekle.
2. ZIP'i geçici bir klasöre çıkar.
3. Yeni LingoLeaf klasörünün içindekileri, Chrome'a daha önce yüklediğin **aynı LingoLeaf klasörünün içine** kopyala; dosyaları değiştir.
4. `chrome://extensions` sayfasında mevcut LingoLeaf kartındaki yenile simgesine bas.
5. Açık web sayfalarını ve yan paneli yenile.

**0.10.0'a geçerken önce yedek al.** Bu sürüm eklentiye sabit bir kimlik verir. Chrome kayıtları eklenti kimliğine bağlı tuttuğu için, 0.9.0 ve öncesinden gelenlerin kelimeleri güncellemeden sonra görünmez (silinmez, eski kimlikte kalır). Güncellemeden **önce** Ayarlar → Yedek indir, güncellemeden **sonra** Ayarlar → Yedek yükle. Bu yalnızca bir kez gerekir.

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

Ayarlar → **Chrome senkronu** açıkken (varsayılan), aynı Google hesabıyla oturum açtığın Chrome'larda (ör. iş ve ev bilgisayarı) kelimelerin eşitlenir. Bunun için Chrome ayarlarında senkron açık olmalı ve senkronize edilenler arasında **Uzantılar** bulunmalı. 0.10.0'dan itibaren `manifest.json`'daki `key` sayesinde eklentinin kimliği her bilgisayarda ve tarayıcıda aynıdır (`ahpbjjdapeegefbckcfnoikbmbggmfgh`), klasör yolu fark etmez.

- Eşitlenenler: kelime/ifade, durum, eklenme ve ilk öğrenme tarihi, Türkçe karşılık ve kaldırılan kelimeler.
- Bu cihazda kalanlar: notlar, örnek cümleler, kaynak bağlantıları, ayarlar, okuma süresi ve geçmiş.
- Aynı kelime iki yerde değiştiyse en son yapılan değişiklik geçerli olur.
- Chrome senkron alanı yaklaşık 100 KB'tır: Türkçe karşılıklarla yaklaşık 2.000, karşılıksız yaklaşık 2.900 kelime sığar. Yer azalınca önce karşılıklar eşitlenmez; alan dolarsa ayarlarda uyarı çıkar ve JSON yedeğiyle taşıyabilirsin.
- Edge'de de aynı şekilde Microsoft hesabıyla Edge'ler arasında çalışır; Chrome ile Edge arasında eşitlemek için aşağıdaki Google Drive senkronunu kullan.

## Google Drive senkronu (isteğe bağlı)

**Bağlanmak:** Ayarlar → Google Drive senkronu → **Google ile bağlan** → hesabını seç → izin ver. Bunu kullandığın her tarayıcıda (ev, iş, Chrome, Edge) bir kez yap; mevcut kelimeler birleşir, hiçbiri silinmez.

LingoLeaf şimdilik Google'ın test modunda: yalnızca erişim listesine eklenen Google hesapları bağlanabilir ve girişte "Google bu uygulamayı doğrulamadı" uyarısı çıkar; **Gelişmiş → LingoLeaf'e git** ile devam edebilirsin. Listeye eklenmek için eklentinin sahibine Gmail adresini ilet.

Chrome ve Edge dahil, Google ile bağladığın her tarayıcıda (ör. evde Chrome, işte Edge) şunlar eşitlenir: kelimeler ve durumları, Türkçe karşılıklar, notlar, örnek cümleler, kaynaklar, kaldırılan kelimeler, ayarlar, öğrenme geçmişi ve okuma süresi.

- Veriler Drive'ındaki **gizli uygulama klasöründe** tek bir `lingoleaf.json` dosyasında durur. Bu dosya Drive'ında listelenmez ve eklenti Drive'ındaki diğer dosyaları göremez (izin kapsamı yalnızca `drive.appdata`).
- Bir kelime iki yerde değiştiyse en son yapılan değişiklik geçerli olur. Ayarlarda da en son değiştirilen geçerli olur.
- Değişikliklerin birkaç saniye içinde Drive'a yazılır. Diğer cihazlardaki değişiklikler tarayıcı açılınca ve en geç 5 dakikada bir gelir. Hemen almak için **Şimdi eşitle**'ye bas.
- Okuma süresi her gün için cihazlardan büyük olanı alır; cihazların süreleri toplanmaz.
- Chrome senkronu ile birlikte açık kalabilir; ikisi aynı kuralla birleştirir.
- **Bağlantıyı kes** bu cihazdaki kayıtları silmez; yalnızca eşitlemeyi durdurur. Erişimi tamamen kaldırmak için Google hesabında *Güvenlik → Üçüncü taraf uygulamalar ve hizmetler* bölümünden uygulamayı kaldırabilirsin.

### Erişim listesine kullanıcı eklemek (eklenti sahibi için)

Google Cloud Console → LingoLeaf projesi → **Google Auth Platform → Kitle (Audience) → Test kullanıcıları → Kullanıcı ekle** → Gmail adresini yaz → **Kaydet**. En fazla 100 kullanıcı eklenebilir.

### Kendi Google istemcini kullanmak (isteğe bağlı)

Yalnızca LingoLeaf'in istemcisi yerine kendi Google Cloud projeni kullanmak istersen gerekir. Ayarlar'daki **Gelişmiş: kendi Google istemcini kullan** bölümüne kendi istemci kimliğini yazarsın. Bir kez yapılır, yaklaşık 10 dakika sürer; ücretsizdir, kart bilgisi gerekmez.

**1. Google Cloud projesi**

1. https://console.cloud.google.com adresine LingoLeaf'i kullanacağın Google hesabıyla gir.
2. Üstteki proje seçiciden **Yeni proje** → ad: `LingoLeaf` → **Oluştur**. Projenin seçili olduğundan emin ol.
3. Sol menü → **API'ler ve Hizmetler → Kitaplık** → `Google Drive API` ara → **Etkinleştir**.

**2. OAuth izin ekranı**

1. **API'ler ve Hizmetler → OAuth izin ekranı** (yeni arayüzde **Google Auth Platform → Branding**). **Başlayın**'a bas.
2. Uygulama adı: `LingoLeaf`, destek e-postası: kendi adresin. Kitle: **Harici (External)**. İletişim e-postası: kendi adresin. Kaydet.
3. **Kitle (Audience)** bölümünde yayın durumu **Test** kalsın. **Test kullanıcıları → Kullanıcı ekle** ile kendi Gmail adresini ekle. (Yalnızca buradaki hesaplar bağlanabilir; Google doğrulaması gerekmez.)
4. **Veri erişimi (Data access)** bölümünde **Kapsam ekle** → `https://www.googleapis.com/auth/drive.appdata` ("See, create, and delete its own configuration data in your Google Drive") → Güncelle → Kaydet.

**3. OAuth istemci kimliği**

1. LingoLeaf → **Ayarlar → Google Drive senkronu → Gelişmiş** → **Bu tarayıcının yönlendirme adresi**'ni **Kopyala**. Eklenti kimliği `manifest.json`'daki `key` ile sabit olduğundan adres her tarayıcıda aynıdır: `https://ahpbjjdapeegefbckcfnoikbmbggmfgh.chromiumapp.org/`.
2. Cloud Console → **API'ler ve Hizmetler → Kimlik bilgileri** (yeni arayüzde **Google Auth Platform → Clients**) → **Kimlik bilgisi oluştur → OAuth istemci kimliği**.
3. Uygulama türü: **Web uygulaması**. Ad: `LingoLeaf`.
4. **Yetkilendirilmiş yönlendirme URI'leri** bölümüne 1. adımdaki adresi ekle (sondaki `/` dahil). *Yetkilendirilmiş JavaScript kaynakları* boş kalabilir.
5. **Oluştur**. Çıkan **İstemci kimliği**'ni (`…apps.googleusercontent.com`) kopyala. İstemci gizli anahtarı (client secret) gerekmez.

**4. Her tarayıcıda bağlan**

1. LingoLeaf → **Ayarlar → Google Drive senkronu → Gelişmiş** → **OAuth istemci kimliği** alanına yapıştır → **Google ile bağlan**.
2. Tarayıcı `www.googleapis.com` erişimi için izin isterse **İzin ver**.
3. Google penceresinde hesabını seç. "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa **Gelişmiş → LingoLeaf'e git (güvenli değil)** de; bu uygulamayı sen oluşturduğun için beklenen bir uyarıdır. Drive izni için **Devam**.
4. Durum satırında "Bağlı · son eşitleme …" görünür. Diğer tarayıcılarda aynı istemci kimliğiyle tekrarla; mevcut kelimeler birleşir, hiçbiri silinmez.

**Sorun giderme**

- `redirect_uri_mismatch`: Yönlendirme adresi istemciye eklenmemiş ya da `manifest.json`'daki `key` kaldırılmış (kimlik değişmiş). Adresi panelden tekrar kopyala ve istemciye ekle; Google'da değişikliğin geçerli olması birkaç dakika sürebilir.
- `access_denied` / "erişim engellendi": Hesap test kullanıcısı olarak eklenmemiş (yukarıdaki erişim listesi).
- "Google oturumunun süresi doldu": Tarayıcıda Google oturumun kapanmış. **Yeniden bağlan**'a bas. Oturum açık kaldıkça eklenti izni sessizce yeniler.

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

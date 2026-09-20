using DocOS.Domain.Entities;
using DocOS.Domain.Enums;
using DocOS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DocOS.Infrastructure.Seeding;

public static class IndianDrugFormularySeeder
{
    public static async Task SeedFormularyAsync(ApplicationDbContext context)
    {
        if (await context.Medicines.AnyAsync(m => m.ClinicId == null))
        {
            return; // Already seeded
        }

        var formulary = GetIndianFormularyList();
        context.Medicines.AddRange(formulary);
        await context.SaveChangesAsync();
    }

    private static List<Medicine> GetIndianFormularyList()
    {
        var list = new List<Medicine>();

        void Add(string brand, string salt, DosageForm form, string strength, string? mfg = null)
        {
            list.Add(new Medicine
            {
                BrandName = brand,
                SaltComposition = salt,
                Form = form,
                Strength = strength,
                Manufacturer = mfg,
                IsCustom = false,
                ClinicId = null
            });
        }

        // ==========================================
        // 1. ANALGESICS, ANTIPYRETICS & NSAIDs
        // ==========================================
        Add("Dolo 650", "Paracetamol", DosageForm.Tablet, "650mg", "Micro Labs");
        Add("Calpol 500", "Paracetamol", DosageForm.Tablet, "500mg", "GSK");
        Add("Calpol 650", "Paracetamol", DosageForm.Tablet, "650mg", "GSK");
        Add("Crocin Advance", "Paracetamol", DosageForm.Tablet, "500mg", "GSK");
        Add("Crocin 650", "Paracetamol", DosageForm.Tablet, "650mg", "GSK");
        Add("Calpol Paediatric Suspension", "Paracetamol", DosageForm.Syrup, "120mg/5ml", "GSK");
        Add("Calpol 250 Pead Suspension", "Paracetamol", DosageForm.Syrup, "250mg/5ml", "GSK");
        Add("Combiflam", "Ibuprofen 400mg + Paracetamol 325mg", DosageForm.Tablet, "400mg + 325mg", "Sanofi");
        Add("Combiflam Suspension", "Ibuprofen 100mg + Paracetamol 162.5mg/5ml", DosageForm.Syrup, "100mg+162.5mg", "Sanofi");
        Add("Ibugesic Plus", "Ibuprofen 400mg + Paracetamol 325mg", DosageForm.Tablet, "400mg + 325mg", "Cipla");
        Add("Zerodol", "Aceclofenac", DosageForm.Tablet, "100mg", "Ipca");
        Add("Zerodol-P", "Aceclofenac 100mg + Paracetamol 325mg", DosageForm.Tablet, "100mg + 325mg", "Ipca");
        Add("Zerodol-SP", "Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg", DosageForm.Tablet, "100+325+15mg", "Ipca");
        Add("Zerodol-TH 4", "Aceclofenac 100mg + Thiocolchicoside 4mg", DosageForm.Tablet, "100mg + 4mg", "Ipca");
        Add("Zerodol-TH 8", "Aceclofenac 100mg + Thiocolchicoside 8mg", DosageForm.Tablet, "100mg + 8mg", "Ipca");
        Add("Hifenac", "Aceclofenac", DosageForm.Tablet, "100mg", "Intas");
        Add("Hifenac-P", "Aceclofenac 100mg + Paracetamol 325mg", DosageForm.Tablet, "100mg + 325mg", "Intas");
        Add("Hifenac-TH 4", "Aceclofenac 100mg + Thiocolchicoside 4mg", DosageForm.Tablet, "100mg + 4mg", "Intas");
        Add("Voveran 50", "Diclofenac Sodium", DosageForm.Tablet, "50mg", "Novartis");
        Add("Voveran SR 75", "Diclofenac Sodium Sustained Release", DosageForm.Tablet, "75mg", "Novartis");
        Add("Voveran SR 100", "Diclofenac Sodium Sustained Release", DosageForm.Tablet, "100mg", "Novartis");
        Add("Voveran Emulgel", "Diclofenac Diethylamine", DosageForm.Ointment, "1.16% w/w", "Novartis");
        Add("Voveran Injection", "Diclofenac Sodium", DosageForm.Injection, "75mg/1ml", "Novartis");
        Add("Volini Gel", "Diclofenac + Methyl Salicylate + Menthol + Linseed Oil", DosageForm.Ointment, "Gel", "Sun Pharma");
        Add("Meftal 500", "Mefenamic Acid", DosageForm.Tablet, "500mg", "Blue Cross");
        Add("Meftal-P Suspension", "Mefenamic Acid", DosageForm.Syrup, "100mg/5ml", "Blue Cross");
        Add("Meftal-Spas", "Mefenamic Acid 250mg + Dicyclomine HCl 10mg", DosageForm.Tablet, "250mg + 10mg", "Blue Cross");
        Add("Cyclopam", "Dicyclomine 20mg + Paracetamol 500mg", DosageForm.Tablet, "20mg + 500mg", "Indoco");
        Add("Drotin 40", "Drotaverine HCl", DosageForm.Tablet, "40mg", "Walter Bushnell");
        Add("Drotin-M", "Drotaverine HCl 80mg + Mefenamic Acid 250mg", DosageForm.Tablet, "80mg + 250mg", "Walter Bushnell");
        Add("Drotin Plus", "Drotaverine HCl 80mg + Paracetamol 500mg", DosageForm.Tablet, "80mg + 500mg", "Walter Bushnell");
        Add("Nise", "Nimesulide", DosageForm.Tablet, "100mg", "Dr. Reddy's");
        Add("Nimesulide-P", "Nimesulide 100mg + Paracetamol 325mg", DosageForm.Tablet, "100mg + 325mg", "Generic");
        Add("Etorica 60", "Etoricoxib", DosageForm.Tablet, "60mg", "Micro Labs");
        Add("Etorica 90", "Etoricoxib", DosageForm.Tablet, "90mg", "Micro Labs");
        Add("Etorica 120", "Etoricoxib", DosageForm.Tablet, "120mg", "Micro Labs");
        Add("Nucoxia 90", "Etoricoxib", DosageForm.Tablet, "90mg", "Zydus");
        Add("Tramazac 50", "Tramadol HCl", DosageForm.Capsule, "50mg", "Zydus");
        Add("Ultracet", "Tramadol 37.5mg + Paracetamol 325mg", DosageForm.Tablet, "37.5mg + 325mg", "Janssen");
        Add("Naprosyn 250", "Naproxen", DosageForm.Tablet, "250mg", "RPG Life");
        Add("Naprosyn 500", "Naproxen", DosageForm.Tablet, "500mg", "RPG Life");
        Add("Ketorol-DT", "Ketorolac Tromethamine", DosageForm.Tablet, "10mg", "Dr. Reddy's");

        // ==========================================
        // 2. ANTIBIOTICS & ANTIMICROBIALS
        // ==========================================
        Add("Augmentin 625 Duo", "Amoxicillin 500mg + Clavulanic Acid 125mg", DosageForm.Tablet, "625mg", "GSK");
        Add("Augmentin 375", "Amoxicillin 250mg + Clavulanic Acid 125mg", DosageForm.Tablet, "375mg", "GSK");
        Add("Augmentin 1000 Duo", "Amoxicillin 875mg + Clavulanic Acid 125mg", DosageForm.Tablet, "1000mg", "GSK");
        Add("Augmentin DDS Dry Syrup", "Amoxicillin 400mg + Clavulanic Acid 57mg/5ml", DosageForm.Syrup, "457mg/5ml", "GSK");
        Add("Clavam 625", "Amoxicillin 500mg + Clavulanic Acid 125mg", DosageForm.Tablet, "625mg", "Alkem");
        Add("Moxikind-CV 625", "Amoxicillin 500mg + Clavulanic Acid 125mg", DosageForm.Tablet, "625mg", "Mankind");
        Add("Novamox 500", "Amoxicillin", DosageForm.Capsule, "500mg", "Cipla");
        Add("Novamox 250", "Amoxicillin", DosageForm.Capsule, "250mg", "Cipla");
        Add("Azithral 500", "Azithromycin", DosageForm.Tablet, "500mg", "Alembic");
        Add("Azithral 250", "Azithromycin", DosageForm.Tablet, "250mg", "Alembic");
        Add("Azee 500", "Azithromycin", DosageForm.Tablet, "500mg", "Cipla");
        Add("Azee 250", "Azithromycin", DosageForm.Tablet, "250mg", "Cipla");
        Add("Azithral 200 Liquid", "Azithromycin", DosageForm.Syrup, "200mg/5ml", "Alembic");
        Add("Taxim-O 200", "Cefixime", DosageForm.Tablet, "200mg", "Alkem");
        Add("Taxim-O 100", "Cefixime", DosageForm.Tablet, "100mg", "Alkem");
        Add("Taxim-O Dry Syrup", "Cefixime", DosageForm.Syrup, "50mg/5ml", "Alkem");
        Add("Taxim-O Forte Dry Syrup", "Cefixime", DosageForm.Syrup, "100mg/5ml", "Alkem");
        Add("Mahacef 200", "Cefixime", DosageForm.Tablet, "200mg", "Mankind");
        Add("Zifi 200", "Cefixime", DosageForm.Tablet, "200mg", "FDC");
        Add("Zifi-CV 200", "Cefixime 200mg + Potassium Clavulanate 125mg", DosageForm.Tablet, "200mg + 125mg", "FDC");
        Add("Monocef-O 200", "Cefpodoxime Proxetil", DosageForm.Tablet, "200mg", "Aristo");
        Add("Monocef-O 100", "Cefpodoxime Proxetil", DosageForm.Tablet, "100mg", "Aristo");
        Add("Monocef-O 50 Dry Syrup", "Cefpodoxime Proxetil", DosageForm.Syrup, "50mg/5ml", "Aristo");
        Add("Gudcef 200", "Cefpodoxime Proxetil", DosageForm.Tablet, "200mg", "Mankind");
        Add("Cefakind 500", "Cefuroxime Axetil", DosageForm.Tablet, "500mg", "Mankind");
        Add("Cefakind 250", "Cefuroxime Axetil", DosageForm.Tablet, "250mg", "Mankind");
        Add("Cetil 500", "Cefuroxime Axetil", DosageForm.Tablet, "500mg", "Lupin");
        Add("Zinnat 500", "Cefuroxime Axetil", DosageForm.Tablet, "500mg", "GSK");
        Add("Cifran 500", "Ciprofloxacin", DosageForm.Tablet, "500mg", "Sun Pharma");
        Add("Ciplox 500", "Ciprofloxacin", DosageForm.Tablet, "500mg", "Cipla");
        Add("Ciplox Eye/Ear Drops", "Ciprofloxacin 0.3%", DosageForm.Drops, "0.3% w/v", "Cipla");
        Add("Zenflox 200", "Ofloxacin", DosageForm.Tablet, "200mg", "Mankind");
        Add("Zenflox-OZ", "Ofloxacin 200mg + Ornidazole 500mg", DosageForm.Tablet, "200mg + 500mg", "Mankind");
        Add("O2 Tablet", "Ofloxacin 200mg + Ornidazole 500mg", DosageForm.Tablet, "200mg + 500mg", "Medley");
        Add("Oflox 200", "Ofloxacin", DosageForm.Tablet, "200mg", "Cipla");
        Add("Levomac 500", "Levofloxacin", DosageForm.Tablet, "500mg", "Macleods");
        Add("Levomac 750", "Levofloxacin", DosageForm.Tablet, "750mg", "Macleods");
        Add("Loxof 500", "Levofloxacin", DosageForm.Tablet, "500mg", "Ranbaxy");
        Add("Doxy-1 L-DR Forte", "Doxycycline 100mg + Lactic Acid Bacillus", DosageForm.Capsule, "100mg", "USV");
        Add("Doxicip 100", "Doxycycline", DosageForm.Capsule, "100mg", "Cipla");
        Add("Flagyl 400", "Metronidazole", DosageForm.Tablet, "400mg", "Abbott");
        Add("Flagyl 200", "Metronidazole", DosageForm.Tablet, "200mg", "Abbott");
        Add("Metrogyl 400", "Metronidazole", DosageForm.Tablet, "400mg", "J.B. Chemicals");
        Add("Norflox 400", "Norfloxacin", DosageForm.Tablet, "400mg", "Cipla");
        Add("Norflox-TZ", "Norfloxacin 400mg + Tinidazole 600mg", DosageForm.Tablet, "400mg + 600mg", "Cipla");
        Add("Rifagut 400", "Rifaximin", DosageForm.Tablet, "400mg", "Sun Pharma");
        Add("Rifagut 550", "Rifaximin", DosageForm.Tablet, "550mg", "Sun Pharma");
        Add("Claribid 500", "Clarithromycin", DosageForm.Tablet, "500mg", "Pfizer");
        Add("Linid 600", "Linezolid", DosageForm.Tablet, "600mg", "Cadila");
        Add("Lizomac 600", "Linezolid", DosageForm.Tablet, "600mg", "Macleods");
        Add("Farobact 200", "Faropenem Sodium", DosageForm.Tablet, "200mg", "Cipla");
        Add("Bactrim DS", "Trimethoprim 160mg + Sulfamethoxazole 800mg", DosageForm.Tablet, "DS", "Abbott");
        Add("Septran DS", "Trimethoprim 160mg + Sulfamethoxazole 800mg", DosageForm.Tablet, "DS", "GSK");
        Add("Monocef 1g Injection", "Ceftriaxone Sodium", DosageForm.Injection, "1000mg", "Aristo");
        Add("Taxim 1g Injection", "Cefotaxime Sodium", DosageForm.Injection, "1000mg", "Alkem");
        Add("Pipzo 4.5g Injection", "Piperacillin 4g + Tazobactam 0.5g", DosageForm.Injection, "4.5g", "Sanofi");
        Add("Meronem 1g Injection", "Meropenem", DosageForm.Injection, "1000mg", "Pfizer");
        Add("Amikacin 500mg Injection", "Amikacin Sulphate", DosageForm.Injection, "500mg/2ml", "Generic");

        // ==========================================
        // 3. GASTROINTESTINAL, ANTACIDS & ANTIEMETICS
        // ==========================================
        Add("Pan 40", "Pantoprazole Sodium", DosageForm.Tablet, "40mg", "Alkem");
        Add("Pan 20", "Pantoprazole Sodium", DosageForm.Tablet, "20mg", "Alkem");
        Add("Pan-D", "Pantoprazole 40mg + Domperidone 30mg SR", DosageForm.Capsule, "40mg + 30mg", "Alkem");
        Add("Pantocid 40", "Pantoprazole", DosageForm.Tablet, "40mg", "Sun Pharma");
        Add("Pantocid-D SR", "Pantoprazole 40mg + Domperidone 30mg SR", DosageForm.Capsule, "40mg + 30mg", "Sun Pharma");
        Add("Pantop 40", "Pantoprazole", DosageForm.Tablet, "40mg", "Aristo");
        Add("Pantop-D", "Pantoprazole 40mg + Domperidone 30mg SR", DosageForm.Capsule, "40mg + 30mg", "Aristo");
        Add("Pan IV Injection", "Pantoprazole Sodium", DosageForm.Injection, "40mg", "Alkem");
        Add("Omez 20", "Omeprazole", DosageForm.Capsule, "20mg", "Dr. Reddy's");
        Add("Omez-D", "Omeprazole 20mg + Domperidone 10mg", DosageForm.Capsule, "20mg + 10mg", "Dr. Reddy's");
        Add("Razo 20", "Rabeprazole Sodium", DosageForm.Tablet, "20mg", "Dr. Reddy's");
        Add("Razo-D", "Rabeprazole 20mg + Domperidone 30mg SR", DosageForm.Capsule, "20mg + 30mg", "Dr. Reddy's");
        Add("Rablet 20", "Rabeprazole Sodium", DosageForm.Tablet, "20mg", "Lupin");
        Add("Rablet-D", "Rabeprazole 20mg + Domperidone 30mg SR", DosageForm.Capsule, "20mg + 30mg", "Lupin");
        Add("Nexpro 40", "Esomeprazole", DosageForm.Tablet, "40mg", "Torrent");
        Add("Nexpro 20", "Esomeprazole", DosageForm.Tablet, "20mg", "Torrent");
        Add("Nexpro-RD 40", "Esomeprazole 40mg + Domperidone 30mg SR", DosageForm.Capsule, "40mg + 30mg", "Torrent");
        Add("Aciloc 150", "Ranitidine HCl", DosageForm.Tablet, "150mg", "Cadila");
        Add("Aciloc 300", "Ranitidine HCl", DosageForm.Tablet, "300mg", "Cadila");
        Add("Gelusil MPS Liquid", "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", DosageForm.Syrup, "Mint Flavor", "Pfizer");
        Add("Digene Gel", "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", DosageForm.Syrup, "Mixed Fruit/Mint", "Abbott");
        Add("Mucaine Gel", "Oxetacaine + Aluminium Hydroxide + Magnesium Hydroxide", DosageForm.Syrup, "Oral Gel", "Pfizer");
        Add("Sucrafil Suspension", "Sucralfate", DosageForm.Syrup, "1000mg/5ml", "Fourrts");
        Add("Sucrafil-O Gel", "Sucralfate 1000mg + Oxetacaine 20mg/10ml", DosageForm.Syrup, "1000mg + 20mg", "Fourrts");
        Add("Emeset 4", "Ondansetron HCl", DosageForm.Tablet, "4mg", "Cipla");
        Add("Emeset 8", "Ondansetron HCl", DosageForm.Tablet, "8mg", "Cipla");
        Add("Emeset MD 4", "Ondansetron Mouth Dissolving", DosageForm.Tablet, "4mg", "Cipla");
        Add("Emeset Syrup", "Ondansetron HCl", DosageForm.Syrup, "2mg/5ml", "Cipla");
        Add("Emeset Injection", "Ondansetron HCl", DosageForm.Injection, "2mg/ml (4mg/2ml)", "Cipla");
        Add("Vomitroy MD", "Ondansetron", DosageForm.Tablet, "4mg", "Troikaa");
        Add("Perinorm 10", "Metoclopramide HCl", DosageForm.Tablet, "10mg", "Ipca");
        Add("Perinorm Injection", "Metoclopramide HCl", DosageForm.Injection, "10mg/2ml", "Ipca");
        Add("Domstal 10", "Domperidone", DosageForm.Tablet, "10mg", "Torrent");
        Add("Domstal Baby Drops", "Domperidone", DosageForm.Drops, "10mg/ml", "Torrent");
        Add("Ganaton 50", "Itopride HCl", DosageForm.Tablet, "50mg", "Abbott");
        Add("Eldoper 2", "Loperamide HCl", DosageForm.Capsule, "2mg", "Micro Labs");
        Add("Imodium 2", "Loperamide HCl", DosageForm.Capsule, "2mg", "Janssen");
        Add("Redotil 100", "Racecadotril", DosageForm.Capsule, "100mg", "Dr. Reddy's");
        Add("Enuff 100", "Racecadotril", DosageForm.Capsule, "100mg", "Glenmark");
        Add("Enuff Extra Sachet", "Racecadotril", DosageForm.Powder, "30mg", "Glenmark");
        Add("Electral Sachet", "Oral Rehydration Salts (WHO Formula)", DosageForm.Powder, "21.8g", "FDC");
        Add("ORS Prolyte", "Oral Rehydration Salts (WHO Formula)", DosageForm.Powder, "Ready Drink 200ml", "Cipla");
        Add("Sporlac-DS", "Lactic Acid Bacillus", DosageForm.Tablet, "120 Million Spores", "Sanzyme");
        Add("Econorm Sachet", "Saccharomyces boulardii", DosageForm.Powder, "250mg", "Dr. Reddy's");
        Add("Darolac Sachet", "Probiotics + Prebiotics", DosageForm.Powder, "Sachet", "Aristo");
        Add("Enterogermina", "Bacillus clausii Spores", DosageForm.Syrup, "2 Billion Spores/5ml", "Sanofi");
        Add("Dulcolax 5", "Bisacodyl", DosageForm.Tablet, "5mg", "Sanofi");
        Add("Cremaffin Syrup", "Liquid Paraffin + Magnesium Hydroxide", DosageForm.Syrup, "Emulsion", "Abbott");
        Add("Cremaffin Plus", "Liquid Paraffin + Milk of Magnesia + Sodium Picosulfate", DosageForm.Syrup, "Emulsion", "Abbott");
        Add("Duphalac Syrup", "Lactulose", DosageForm.Syrup, "3.33g/5ml (66.7%)", "Abbott");
        Add("Looz Syrup", "Lactulose", DosageForm.Syrup, "10g/15ml", "Intas");
        Add("Pegclear Powder", "Polyethylene Glycol", DosageForm.Powder, "Sachet", "Zydus");
        Add("Isabgol Husk", "Psyllium Husk", DosageForm.Powder, "Pure Husk", "Baidyanath");

        // ==========================================
        // 4. RESPIRATORY, ANTI-ALLERGIC & COUGH
        // ==========================================
        Add("Montair-LC", "Montelukast 10mg + Levocetirizine 5mg", DosageForm.Tablet, "10mg + 5mg", "Cipla");
        Add("Montair-LC Kid", "Montelukast 4mg + Levocetirizine 2.5mg", DosageForm.Tablet, "4mg + 2.5mg", "Cipla");
        Add("Montair-LC Syrup", "Montelukast 4mg + Levocetirizine 2.5mg/5ml", DosageForm.Syrup, "4mg + 2.5mg", "Cipla");
        Add("Monticope", "Montelukast 10mg + Levocetirizine 5mg", DosageForm.Tablet, "10mg + 5mg", "Mankind");
        Add("Telekast-L", "Montelukast 10mg + Levocetirizine 5mg", DosageForm.Tablet, "10mg + 5mg", "Lupin");
        Add("Levocet 5", "Levocetirizine HCl", DosageForm.Tablet, "5mg", "Hetero");
        Add("Vozet 5", "Levocetirizine HCl", DosageForm.Tablet, "5mg", "Dr. Reddy's");
        Add("Cetzine 10", "Cetirizine Dihydrochloride", DosageForm.Tablet, "10mg", "GSK");
        Add("Alerid 10", "Cetirizine Dihydrochloride", DosageForm.Tablet, "10mg", "Cipla");
        Add("Alerid Syrup", "Cetirizine Dihydrochloride", DosageForm.Syrup, "5mg/5ml", "Cipla");
        Add("Allegra 120", "Fexofenadine HCl", DosageForm.Tablet, "120mg", "Sanofi");
        Add("Allegra 180", "Fexofenadine HCl", DosageForm.Tablet, "180mg", "Sanofi");
        Add("Allegra Suspension", "Fexofenadine HCl", DosageForm.Syrup, "30mg/5ml", "Sanofi");
        Add("Bilahist 20", "Bilastine", DosageForm.Tablet, "20mg", "Sun Pharma");
        Add("Bilaxten 20", "Bilastine", DosageForm.Tablet, "20mg", "Menarini");
        Add("Cheston Cold", "Cetirizine 5mg + Paracetamol 325mg + Phenylephrine 10mg", DosageForm.Tablet, "5+325+10mg", "Cipla");
        Add("Sinarest", "Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg", DosageForm.Tablet, "500+10+2mg", "Centaur");
        Add("Solvin Cold", "Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg", DosageForm.Tablet, "500+10+2mg", "Ipca");
        Add("Wikoryl", "Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg", DosageForm.Tablet, "500+10+2mg", "Alembic");
        Add("Alex Cough Syrup", "Dextromethorphan + Chlorpheniramine + Phenylephrine", DosageForm.Syrup, "100ml", "Glenmark");
        Add("Ascoril-D Plus", "Dextromethorphan + Chlorpheniramine + Phenylephrine", DosageForm.Syrup, "100ml", "Glenmark");
        Add("Ascoril-LS", "Levosalbutamol 1mg + Ambroxol 30mg + Guaiphenesin 50mg/5ml", DosageForm.Syrup, "100ml", "Glenmark");
        Add("Asthalin Expectorant", "Salbutamol 2mg + Guaiphenesin 100mg/5ml", DosageForm.Syrup, "100ml", "Cipla");
        Add("Grilinctus", "Dextromethorphan + Chlorpheniramine + Ammonium Chloride", DosageForm.Syrup, "100ml", "Franco-Indian");
        Add("Bro-Zedex", "Bromhexine + Terbutaline + Guaiphenesin + Menthol", DosageForm.Syrup, "100ml", "Wockhardt");
        Add("Benadryl Cough Syrup", "Diphenhydramine + Ammonium Chloride + Sodium Citrate", DosageForm.Syrup, "100ml", "Johnson & Johnson");
        Add("Asthalin Inhaler", "Salbutamol", DosageForm.Inhaler, "100mcg/puff", "Cipla");
        Add("Asthalin Respules", "Salbutamol", DosageForm.Drops, "2.5mg/2.5ml", "Cipla");
        Add("Budecort Inhaler 200", "Budesonide", DosageForm.Inhaler, "200mcg", "Cipla");
        Add("Budecort Respules 0.5mg", "Budesonide", DosageForm.Drops, "0.5mg/2ml", "Cipla");
        Add("Budecort Respules 1mg", "Budesonide", DosageForm.Drops, "1.0mg/2ml", "Cipla");
        Add("Duolin Respules", "Levosalbutamol 1.25mg + Ipratropium Bromide 500mcg", DosageForm.Drops, "2.5ml", "Cipla");
        Add("Foracort 200 Rotacaps", "Formoterol 6mcg + Budesonide 200mcg", DosageForm.Inhaler, "200mcg", "Cipla");
        Add("Foracort 400 Inhaler", "Formoterol 6mcg + Budesonide 400mcg", DosageForm.Inhaler, "400mcg", "Cipla");
        Add("Seroflo 250 Synchrobreathe", "Salmeterol 25mcg + Fluticasone 250mcg", DosageForm.Inhaler, "250mcg", "Cipla");
        Add("Otrivin Nasal Drops (Adult)", "Xylometazoline HCl 0.1%", DosageForm.Drops, "0.1% w/v", "GSK");
        Add("Otrivin Paediatric", "Xylometazoline HCl 0.05%", DosageForm.Drops, "0.05% w/v", "GSK");
        Add("Nasivion Adult", "Oxymetazoline HCl 0.05%", DosageForm.Drops, "0.05%", "Procter & Gamble");
        Add("Nasivion Mini (Paed)", "Oxymetazoline HCl 0.01%", DosageForm.Drops, "0.01%", "Procter & Gamble");
        Add("Solspre Nasal Spray", "Normal Saline (Sodium Chloride 0.65%)", DosageForm.Drops, "0.65% w/v", "Sun Pharma");

        // ==========================================
        // 5. CARDIOVASCULAR & ANTIHYPERTENSIVES
        // ==========================================
        Add("Telma 40", "Telmisartan", DosageForm.Tablet, "40mg", "Glenmark");
        Add("Telma 20", "Telmisartan", DosageForm.Tablet, "20mg", "Glenmark");
        Add("Telma 80", "Telmisartan", DosageForm.Tablet, "80mg", "Glenmark");
        Add("Telma-H", "Telmisartan 40mg + Hydrochlorothiazide 12.5mg", DosageForm.Tablet, "40mg + 12.5mg", "Glenmark");
        Add("Telma-AM", "Telmisartan 40mg + Amlodipine 5mg", DosageForm.Tablet, "40mg + 5mg", "Glenmark");
        Add("Telmikind 40", "Telmisartan", DosageForm.Tablet, "40mg", "Mankind");
        Add("Telpres 40", "Telmisartan", DosageForm.Tablet, "40mg", "Abbott");
        Add("Amlong 5", "Amlodipine Besylate", DosageForm.Tablet, "5mg", "Micro Labs");
        Add("Amlong 2.5", "Amlodipine Besylate", DosageForm.Tablet, "2.5mg", "Micro Labs");
        Add("Amlong 10", "Amlodipine Besylate", DosageForm.Tablet, "10mg", "Micro Labs");
        Add("Amlip 5", "Amlodipine Besylate", DosageForm.Tablet, "5mg", "Cipla");
        Add("Stamlo 5", "Amlodipine Besylate", DosageForm.Tablet, "5mg", "Dr. Reddy's");
        Add("Amlong-AT", "Amlodipine 5mg + Atenolol 50mg", DosageForm.Tablet, "5mg + 50mg", "Micro Labs");
        Add("Starpress-XL 25", "Metoprolol Succinate Extended Release", DosageForm.Tablet, "25mg", "Lupin");
        Add("Starpress-XL 50", "Metoprolol Succinate Extended Release", DosageForm.Tablet, "50mg", "Lupin");
        Add("Met-XL 25", "Metoprolol Succinate Extended Release", DosageForm.Tablet, "25mg", "Ajanta");
        Add("Met-XL 50", "Metoprolol Succinate Extended Release", DosageForm.Tablet, "50mg", "Ajanta");
        Add("Betaloc 25", "Metoprolol Tartrate", DosageForm.Tablet, "25mg", "AstraZeneca");
        Add("Betaloc 50", "Metoprolol Tartrate", DosageForm.Tablet, "50mg", "AstraZeneca");
        Add("Concor 5", "Bisoprolol Fumarate", DosageForm.Tablet, "5mg", "Merck");
        Add("Concor 2.5", "Bisoprolol Fumarate", DosageForm.Tablet, "2.5mg", "Merck");
        Add("Nebicard 5", "Nebivolol HCl", DosageForm.Tablet, "5mg", "Torrent");
        Add("Nebicard 2.5", "Nebivolol HCl", DosageForm.Tablet, "2.5mg", "Torrent");
        Add("Losar 50", "Losartan Potassium", DosageForm.Tablet, "50mg", "Unichem");
        Add("Losar 25", "Losartan Potassium", DosageForm.Tablet, "25mg", "Unichem");
        Add("Losar-H", "Losartan Potassium 50mg + Hydrochlorothiazide 12.5mg", DosageForm.Tablet, "50mg + 12.5mg", "Unichem");
        Add("Olmecip 20", "Olmesartan Medoxomil", DosageForm.Tablet, "20mg", "Cipla");
        Add("Olmecip 40", "Olmesartan Medoxomil", DosageForm.Tablet, "40mg", "Cipla");
        Add("Cardace 2.5", "Ramipril", DosageForm.Tablet, "2.5mg", "Sanofi");
        Add("Cardace 5", "Ramipril", DosageForm.Tablet, "5mg", "Sanofi");
        Add("Cardivas 3.125", "Carvedilol", DosageForm.Tablet, "3.125mg", "Sun Pharma");
        Add("Cardivas 6.25", "Carvedilol", DosageForm.Tablet, "6.25mg", "Sun Pharma");
        Add("Cardivas 12.5", "Carvedilol", DosageForm.Tablet, "12.5mg", "Sun Pharma");
        Add("Atorva 10", "Atorvastatin Calcium", DosageForm.Tablet, "10mg", "Zydus");
        Add("Atorva 20", "Atorvastatin Calcium", DosageForm.Tablet, "20mg", "Zydus");
        Add("Atorva 40", "Atorvastatin Calcium", DosageForm.Tablet, "40mg", "Zydus");
        Add("Storvas 10", "Atorvastatin Calcium", DosageForm.Tablet, "10mg", "Sun Pharma");
        Add("Storvas 20", "Atorvastatin Calcium", DosageForm.Tablet, "20mg", "Sun Pharma");
        Add("Rozavel 10", "Rosuvastatin", DosageForm.Tablet, "10mg", "Sun Pharma");
        Add("Rozavel 20", "Rosuvastatin", DosageForm.Tablet, "20mg", "Sun Pharma");
        Add("Rosuvas 10", "Rosuvastatin", DosageForm.Tablet, "10mg", "Ranbaxy");
        Add("Rosuvas 20", "Rosuvastatin", DosageForm.Tablet, "20mg", "Ranbaxy");
        Add("Ecosprin 75", "Aspirin (Enteric Coated)", DosageForm.Tablet, "75mg", "USV");
        Add("Ecosprin 150", "Aspirin (Enteric Coated)", DosageForm.Tablet, "150mg", "USV");
        Add("Ecosprin-AV 75", "Aspirin 75mg + Atorvastatin 10mg", DosageForm.Capsule, "75mg + 10mg", "USV");
        Add("Ecosprin-AV 150", "Aspirin 150mg + Atorvastatin 20mg", DosageForm.Capsule, "150mg + 20mg", "USV");
        Add("Clopilet 75", "Clopidogrel", DosageForm.Tablet, "75mg", "Sun Pharma");
        Add("Clopilet-A 75", "Clopidogrel 75mg + Aspirin 75mg", DosageForm.Capsule, "75mg + 75mg", "Sun Pharma");
        Add("Lasix 40", "Furosemide", DosageForm.Tablet, "40mg", "Sanofi");
        Add("Lasix Injection", "Furosemide", DosageForm.Injection, "20mg/2ml", "Sanofi");
        Add("Dytor 10", "Torsemide", DosageForm.Tablet, "10mg", "Cipla");
        Add("Dytor 20", "Torsemide", DosageForm.Tablet, "20mg", "Cipla");
        Add("Aldactone 25", "Spironolactone", DosageForm.Tablet, "25mg", "RPG Life");

        // ==========================================
        // 6. ANTIDIABETIC
        // ==========================================
        Add("Glycomet 500", "Metformin Hydrochloride", DosageForm.Tablet, "500mg", "USV");
        Add("Glycomet 500 SR", "Metformin Hydrochloride Sustained Release", DosageForm.Tablet, "500mg", "USV");
        Add("Glycomet 850", "Metformin Hydrochloride", DosageForm.Tablet, "850mg", "USV");
        Add("Glycomet 1000 SR", "Metformin Hydrochloride Sustained Release", DosageForm.Tablet, "1000mg", "USV");
        Add("Glycomet-GP 1", "Glimepiride 1mg + Metformin 500mg SR", DosageForm.Tablet, "1mg + 500mg", "USV");
        Add("Glycomet-GP 2", "Glimepiride 2mg + Metformin 500mg SR", DosageForm.Tablet, "2mg + 500mg", "USV");
        Add("Glycomet-GP 1 Forte", "Glimepiride 1mg + Metformin 1000mg SR", DosageForm.Tablet, "1mg + 1000mg", "USV");
        Add("Glycomet-GP 2 Forte", "Glimepiride 2mg + Metformin 1000mg SR", DosageForm.Tablet, "2mg + 1000mg", "USV");
        Add("Amaryl 1", "Glimepiride", DosageForm.Tablet, "1mg", "Sanofi");
        Add("Amaryl 2", "Glimepiride", DosageForm.Tablet, "2mg", "Sanofi");
        Add("Amaryl-M 1", "Glimepiride 1mg + Metformin 500mg", DosageForm.Tablet, "1mg + 500mg", "Sanofi");
        Add("Amaryl-M 2", "Glimepiride 2mg + Metformin 500mg", DosageForm.Tablet, "2mg + 500mg", "Sanofi");
        Add("Diamicron XR 60", "Gliclazide Modified Release", DosageForm.Tablet, "60mg", "Serdia");
        Add("Januvia 100", "Sitagliptin Phosphate", DosageForm.Tablet, "100mg", "MSD");
        Add("Januvia 50", "Sitagliptin Phosphate", DosageForm.Tablet, "50mg", "MSD");
        Add("Janumet 50/500", "Sitagliptin 50mg + Metformin 500mg", DosageForm.Tablet, "50mg + 500mg", "MSD");
        Add("Janumet 50/1000", "Sitagliptin 50mg + Metformin 1000mg", DosageForm.Tablet, "50mg + 1000mg", "MSD");
        Add("Galvus 50", "Vildagliptin", DosageForm.Tablet, "50mg", "Novartis");
        Add("Galvus Met 50/500", "Vildagliptin 50mg + Metformin 500mg", DosageForm.Tablet, "50mg + 500mg", "Novartis");
        Add("Galvus Met 50/850", "Vildagliptin 50mg + Metformin 850mg", DosageForm.Tablet, "50mg + 850mg", "Novartis");
        Add("Galvus Met 50/1000", "Vildagliptin 50mg + Metformin 1000mg", DosageForm.Tablet, "50mg + 1000mg", "Novartis");
        Add("Tenepure 20", "Teneligliptin", DosageForm.Tablet, "20mg", "Micro Labs");
        Add("Tenali-M", "Teneligliptin 20mg + Metformin 500mg SR", DosageForm.Tablet, "20mg + 500mg", "Mankind");
        Add("Forxiga 10", "Dapagliflozin", DosageForm.Tablet, "10mg", "AstraZeneca");
        Add("Forxiga 5", "Dapagliflozin", DosageForm.Tablet, "5mg", "AstraZeneca");
        Add("Oxra 10", "Dapagliflozin", DosageForm.Tablet, "10mg", "Sun Pharma");
        Add("Jardiance 10", "Empagliflozin", DosageForm.Tablet, "10mg", "Boehringer Ingelheim");
        Add("Jardiance 25", "Empagliflozin", DosageForm.Tablet, "25mg", "Boehringer Ingelheim");
        Add("Gibtulio 10", "Empagliflozin", DosageForm.Tablet, "10mg", "Lupin");
        Add("Volibo 0.2", "Voglibose", DosageForm.Tablet, "0.2mg", "Sun Pharma");
        Add("Volibo 0.3", "Voglibose", DosageForm.Tablet, "0.3mg", "Sun Pharma");
        Add("Pioz 15", "Pioglitazone", DosageForm.Tablet, "15mg", "USV");
        Add("Human Mixtard 30/70", "Biphasic Isophane Insulin 30/70", DosageForm.Injection, "40IU/ml (10ml)", "Novo Nordisk");
        Add("Lantus Solostar", "Insulin Glargine", DosageForm.Injection, "100IU/ml (3ml pen)", "Sanofi");
        Add("Novorapid Flexpen", "Insulin Aspart", DosageForm.Injection, "100IU/ml (3ml pen)", "Novo Nordisk");

        // ==========================================
        // 7. VITAMINS, MINERALS & SUPPLEMENTS
        // ==========================================
        Add("Shelcal 500", "Calcium Carbonate 500mg + Vitamin D3 250IU", DosageForm.Tablet, "500mg", "Torrent");
        Add("Shelcal-HD", "Calcium Carbonate 500mg + Vitamin D3 500IU", DosageForm.Tablet, "500mg + 500IU", "Torrent");
        Add("Cipcal 500", "Calcium Carbonate 500mg + Vitamin D3 250IU", DosageForm.Tablet, "500mg", "Cipla");
        Add("Calcirol Sachet", "Cholecalciferol (Vitamin D3)", DosageForm.Powder, "60,000 IU", "Cadila");
        Add("D3 Must 60K", "Cholecalciferol (Vitamin D3)", DosageForm.Capsule, "60,000 IU", "Mankind");
        Add("Uprise-D3 60K", "Cholecalciferol (Vitamin D3)", DosageForm.Capsule, "60,000 IU", "Alkem");
        Add("Becosules Z", "B-Complex + Vitamin C + Zinc", DosageForm.Capsule, "Multivitamin", "Pfizer");
        Add("Neurobion Forte", "Vitamin B1 + B6 + B12 + Nicotinamide", DosageForm.Tablet, "B-Complex", "Procter & Gamble");
        Add("Neurobion Forte Injection", "Vitamin B12 + B6 + Nicotinamide", DosageForm.Injection, "2ml", "Procter & Gamble");
        Add("Nurokind-LC", "Levocarnitine + Mecobalamin + Folic Acid", DosageForm.Tablet, "Multivitamin", "Mankind");
        Add("Nurokind-Plus RF", "Mecobalamin 1500mcg + Alpha Lipoic Acid + Pyridoxine + Folic Acid", DosageForm.Capsule, "1500mcg", "Mankind");
        Add("Orofer-XT", "Ferrous Ascorbate (Iron 100mg) + Folic Acid 1.5mg", DosageForm.Tablet, "100mg + 1.5mg", "Emcure");
        Add("Orofer-XT Syrup", "Ferrous Ascorbate + Folic Acid", DosageForm.Syrup, "30mg/5ml", "Emcure");
        Add("Autrin", "Ferrous Fumarate + Vitamin B12 + Folic Acid", DosageForm.Capsule, "Hematinic", "Pfizer");
        Add("Limcee 500 Chewable", "Vitamin C (Ascorbic Acid)", DosageForm.Tablet, "500mg", "Abbott");
        Add("Celin 500", "Vitamin C (Ascorbic Acid)", DosageForm.Tablet, "500mg", "GSK");
        Add("Zincovit", "Multivitamins + Multiminerals + Zinc", DosageForm.Tablet, "Multivitamin", "Apex Labs");
        Add("Zincovit Syrup", "Multivitamins + Multiminerals + Zinc", DosageForm.Syrup, "100ml / 200ml", "Apex Labs");
        Add("A to Z NS", "Multivitamins + Multiminerals + Pine Bark Extract", DosageForm.Tablet, "Multivitamin", "Alkem");
        Add("Evion 400", "Vitamin E (Tocopherol)", DosageForm.Capsule, "400mg", "Merck");
        Add("Evion 600", "Vitamin E (Tocopherol)", DosageForm.Capsule, "600mg", "Merck");
        Add("Folvite 5", "Folic Acid", DosageForm.Tablet, "5mg", "Pfizer");
        Add("Supradyn Daily", "Multivitamins + Minerals + Trace Elements", DosageForm.Tablet, "Daily", "Bayer");

        // ==========================================
        // 8. NEUROPSYCHIATRY & CNS
        // ==========================================
        Add("Nexito 10", "Escitalopram Oxalate", DosageForm.Tablet, "10mg", "Sun Pharma");
        Add("Nexito 5", "Escitalopram Oxalate", DosageForm.Tablet, "5mg", "Sun Pharma");
        Add("Nexito Plus", "Escitalopram 5mg + Clonazepam 0.5mg", DosageForm.Tablet, "5mg + 0.5mg", "Sun Pharma");
        Add("Nexito Forte", "Escitalopram 10mg + Clonazepam 0.5mg", DosageForm.Tablet, "10mg + 0.5mg", "Sun Pharma");
        Add("Clonafit 0.5", "Clonazepam", DosageForm.Tablet, "0.5mg", "Mankind");
        Add("Clonafit 0.25", "Clonazepam", DosageForm.Tablet, "0.25mg", "Mankind");
        Add("Zapiz 0.5", "Clonazepam", DosageForm.Tablet, "0.5mg", "Intas");
        Add("Alprax 0.25", "Alprazolam", DosageForm.Tablet, "0.25mg", "Torrent");
        Add("Alprax 0.5", "Alprazolam", DosageForm.Tablet, "0.5mg", "Torrent");
        Add("Restyl 0.25", "Alprazolam", DosageForm.Tablet, "0.25mg", "Cipla");
        Add("Zolfresh 10", "Zolpidem Tartrate", DosageForm.Tablet, "10mg", "Abbott");
        Add("Zolfresh 5", "Zolpidem Tartrate", DosageForm.Tablet, "5mg", "Abbott");
        Add("Sertima 50", "Sertraline HCl", DosageForm.Tablet, "50mg", "Intas");
        Add("Sertima 100", "Sertraline HCl", DosageForm.Tablet, "100mg", "Intas");
        Add("Gabapin 100", "Gabapentin", DosageForm.Capsule, "100mg", "Intas");
        Add("Gabapin 300", "Gabapentin", DosageForm.Capsule, "300mg", "Intas");
        Add("Gabapin-NT", "Gabapentin 400mg + Nortriptyline 10mg", DosageForm.Tablet, "400mg + 10mg", "Intas");
        Add("Maxgalin 75", "Pregabalin", DosageForm.Capsule, "75mg", "Sun Pharma");
        Add("Maxgalin 50", "Pregabalin", DosageForm.Capsule, "50mg", "Sun Pharma");
        Add("Pregeb-M 75", "Pregabalin 75mg + Methylcobalamin 750mcg", DosageForm.Capsule, "75mg + 750mcg", "Torrent");
        Add("Dulane 20", "Duloxetine HCl", DosageForm.Capsule, "20mg", "Sun Pharma");
        Add("Dulane 30", "Duloxetine HCl", DosageForm.Capsule, "30mg", "Sun Pharma");
        Add("Tryptomer 10", "Amitriptyline HCl", DosageForm.Tablet, "10mg", "Wockhardt");
        Add("Tryptomer 25", "Amitriptyline HCl", DosageForm.Tablet, "25mg", "Wockhardt");
        Add("Eptoin 100", "Phenytoin Sodium", DosageForm.Tablet, "100mg", "Abbott");
        Add("Valparin Chrono 300", "Sodium Valproate + Valproic Acid", DosageForm.Tablet, "300mg", "Sanofi");
        Add("Valparin Chrono 500", "Sodium Valproate + Valproic Acid", DosageForm.Tablet, "500mg", "Sanofi");

        // ==========================================
        // 9. DERMATOLOGY, TOPICAL & ANTIFUNGAL
        // ==========================================
        Add("Betnovate-C", "Betamethasone Valerate 0.1% + Clioquinol 3%", DosageForm.Ointment, "20g", "GSK");
        Add("Betnovate-N", "Betamethasone Valerate 0.1% + Neomycin Sulphate 0.5%", DosageForm.Ointment, "20g", "GSK");
        Add("Betnovate Cream", "Betamethasone Valerate 0.1%", DosageForm.Ointment, "20g", "GSK");
        Add("Candid-B Cream", "Clotrimazole 1% + Beclomethasone 0.025%", DosageForm.Ointment, "20g", "Glenmark");
        Add("Candid Cream", "Clotrimazole 1%", DosageForm.Ointment, "30g", "Glenmark");
        Add("Candid Dusting Powder", "Clotrimazole 1%", DosageForm.Powder, "100g", "Glenmark");
        Add("Candid Mouth Paint", "Clotrimazole 1%", DosageForm.Drops, "15ml", "Glenmark");
        Add("Fourderm Cream", "Clobetasol + Neomycin + Miconazole + Chlorocresol", DosageForm.Ointment, "10g", "Cipla");
        Add("Quadriderm RF", "Beclomethasone + Clotrimazole + Gentamicin", DosageForm.Ointment, "10g", "Fulford");
        Add("Bactroban Ointment", "Mupirocin 2%", DosageForm.Ointment, "5g / 15g", "GSK");
        Add("T-Bact Ointment", "Mupirocin 2%", DosageForm.Ointment, "5g / 15g", "GSK");
        Add("Soframycin Skin Cream", "Framycetin Sulphate 1%", DosageForm.Ointment, "30g", "Sanofi");
        Add("Silverex Ionic Gel", "Silver Sulfadiazine 1% + Chlorhexidine", DosageForm.Ointment, "20g", "Ranbaxy");
        Add("Burnol", "Aminacrine HCl 0.1% + Cetrimide 0.5%", DosageForm.Ointment, "20g", "Dr. Morepen");
        Add("Zocon 150", "Fluconazole", DosageForm.Tablet, "150mg", "FDC");
        Add("Forcan 150", "Fluconazole", DosageForm.Tablet, "150mg", "Cipla");
        Add("Itracon 100", "Itraconazole", DosageForm.Capsule, "100mg", "Torrent");
        Add("Candiforce 200", "Itraconazole", DosageForm.Capsule, "200mg", "Mankind");
        Add("Candiforce 100", "Itraconazole", DosageForm.Capsule, "100mg", "Mankind");
        Add("Tyza 250", "Terbinafine HCl", DosageForm.Tablet, "250mg", "Abbott");
        Add("Sebifin Cream", "Terbinafine HCl 1%", DosageForm.Ointment, "15g", "Sun Pharma");
        Add("Nizral 2% Shampoo", "Ketoconazole 2%", DosageForm.Lotion, "50ml / 100ml", "Johnson & Johnson");
        Add("Caladryl Lotion", "Calamine + Diphenhydramine", DosageForm.Lotion, "120ml", "Piramal");
        Add("Moiz Cleansing Lotion", "Cetyl Alcohol + Stearyl Alcohol", DosageForm.Lotion, "200ml", "Curatio");
        Add("Scaboma Lotion", "Lindane 1%", DosageForm.Lotion, "100ml", "Mankind");
        Add("Permite 5% Cream", "Permethrin 5%", DosageForm.Ointment, "30g", "Curatio");

        // ==========================================
        // 10. OPHTHALMOLOGY & ENT
        // ==========================================
        Add("Moxicip Eye Drops", "Moxifloxacin HCl 0.5%", DosageForm.Drops, "5ml", "Cipla");
        Add("Vigamox Eye Drops", "Moxifloxacin HCl 0.5%", DosageForm.Drops, "5ml", "Alcon");
        Add("Tobrex Eye Drops", "Tobramycin 0.3%", DosageForm.Drops, "5ml", "Alcon");
        Add("Tobracip-D", "Tobramycin 0.3% + Dexamethasone 0.1%", DosageForm.Drops, "5ml", "Cipla");
        Add("Refresh Tears Eye Drops", "Carboxymethylcellulose 0.5%", DosageForm.Drops, "10ml", "Allergan");
        Add("Systane Ultra", "Polyethylene Glycol 400 + Propylene Glycol", DosageForm.Drops, "10ml", "Alcon");
        Add("Clearwax Ear Drops", "Paradichlorobenzene + Benzocaine + Chlorbutol + Turpentine Oil", DosageForm.Drops, "10ml", "Cipla");
        Add("Waxolve Ear Drops", "Paradichlorobenzene + Benzocaine + Chlorbutol", DosageForm.Drops, "10ml", "Macleods");
        Add("Otogesic Ear Drops", "Chlorbutol + Benzocaine + Paracetamol", DosageForm.Drops, "5ml", "FDC");
        Add("Candid Ear Drops", "Clotrimazole 1% + Lignocaine 2%", DosageForm.Drops, "10ml", "Glenmark");

        // ==========================================
        // 11. THYROID, HORMONES & STEROIDS
        // ==========================================
        Add("Thyronorm 25", "Levothyroxine Sodium", DosageForm.Tablet, "25mcg", "Abbott");
        Add("Thyronorm 50", "Levothyroxine Sodium", DosageForm.Tablet, "50mcg", "Abbott");
        Add("Thyronorm 75", "Levothyroxine Sodium", DosageForm.Tablet, "75mcg", "Abbott");
        Add("Thyronorm 100", "Levothyroxine Sodium", DosageForm.Tablet, "100mcg", "Abbott");
        Add("Thyronorm 125", "Levothyroxine Sodium", DosageForm.Tablet, "125mcg", "Abbott");
        Add("Eltroxin 50", "Levothyroxine Sodium", DosageForm.Tablet, "50mcg", "GSK");
        Add("Eltroxin 100", "Levothyroxine Sodium", DosageForm.Tablet, "100mcg", "GSK");
        Add("Wysolone 5", "Prednisolone", DosageForm.Tablet, "5mg", "Pfizer");
        Add("Wysolone 10", "Prednisolone", DosageForm.Tablet, "10mg", "Pfizer");
        Add("Wysolone 20", "Prednisolone", DosageForm.Tablet, "20mg", "Pfizer");
        Add("Omnacortil 5", "Prednisolone", DosageForm.Tablet, "5mg", "Macleods");
        Add("Omnacortil 10", "Prednisolone", DosageForm.Tablet, "10mg", "Macleods");
        Add("Omnacortil 20", "Prednisolone", DosageForm.Tablet, "20mg", "Macleods");
        Add("Omnacortil Drops", "Prednisolone Sodium Phosphate", DosageForm.Drops, "5mg/ml", "Macleods");
        Add("Dexona 0.5", "Dexamethasone", DosageForm.Tablet, "0.5mg", "Zydus");
        Add("Dexona Injection", "Dexamethasone Sodium Phosphate", DosageForm.Injection, "4mg/ml (2ml)", "Zydus");
        Add("Betnesol 0.5", "Betamethasone Sodium Phosphate", DosageForm.Tablet, "0.5mg", "GSK");
        Add("Betnesol Injection", "Betamethasone Sodium Phosphate", DosageForm.Injection, "4mg/ml", "GSK");
        Add("Defcort 6", "Deflazacort", DosageForm.Tablet, "6mg", "Macleods");
        Add("Defcort 12", "Deflazacort", DosageForm.Tablet, "12mg", "Macleods");
        Add("Primolut-N", "Norethisterone", DosageForm.Tablet, "5mg", "Bayer");
        Add("Deviry 10", "Medroxyprogesterone Acetate", DosageForm.Tablet, "10mg", "Torrent");
        Add("Susten 200", "Natural Micronized Progesterone", DosageForm.Capsule, "200mg", "Sun Pharma");

        // ==========================================
        // 12. UROLOGY & NEPHROLOGY
        // ==========================================
        Add("Urimax 0.4", "Tamsulosin Hydrochloride", DosageForm.Capsule, "0.4mg", "Cipla");
        Add("Urimax-D", "Tamsulosin 0.4mg + Dutasteride 0.5mg", DosageForm.Capsule, "0.4mg + 0.5mg", "Cipla");
        Add("Silodal 8", "Silodosin", DosageForm.Capsule, "8mg", "Sun Pharma");
        Add("Silodal 4", "Silodosin", DosageForm.Capsule, "4mg", "Sun Pharma");
        Add("Cital Syrup", "Disodium Hydrogen Citrate 1.38g/5ml", DosageForm.Syrup, "Alkalizer", "Indoco");
        Add("Alkarate Syrup", "Disodium Hydrogen Citrate", DosageForm.Syrup, "Alkalizer", "Torrent");
        Add("Urikind-KM", "Potassium Magnesium Citrate + Vitamin B6", DosageForm.Syrup, "200ml", "Mankind");
        Add("Neeri Syrup", "Herbal Formulation for Kidney Stones & UTI", DosageForm.Syrup, "200ml", "Aimil");
        Add("Cystone Tablet", "Herbal Formulation for Urinary Tract", DosageForm.Tablet, "60 Tabs", "Himalaya");

        return list;
    }
}

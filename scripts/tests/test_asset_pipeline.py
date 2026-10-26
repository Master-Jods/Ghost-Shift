import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
SCRIPTS=Path(__file__).resolve().parents[1];sys.path.insert(0,str(SCRIPTS))
spec=importlib.util.spec_from_file_location('sync_assets',SCRIPTS/'sync-pokemon-assets.py');pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
from asset_model_validation import approved_models

def node(name,author='ARTIST',canon=True,children=None):return {'name':name,'canon':canon,'sprite_files':{'Walk':False},'sprite_credit':{'primary':author,'secondary':[]},'subgroups':children or {}}
class AssetPipelineTests(unittest.TestCase):
 def test_regional_and_form_aliases_are_token_based(self):
  for a,b in [('Alolan','alola'),('Galarian','galar'),('Hisuian','hisui'),('Paldean','paldea'),('Mega_X','mega-x'),('Crowned_Sword','crowned'),('blue-striped','Blue')]:self.assertEqual(pipeline.norm(a),pipeline.norm(b))
  self.assertNotEqual(pipeline.norm('female'),pipeline.norm('male'))
 def test_original_alternate_style_keeps_default_identity_without_official_recolor(self):
  pipeline.SPECIES_BY_ID={133:{'identifier':'eevee'}};root=node('Eevee','CHUNSOFT',children={'0001':node('Altcolor'),'0002':node('Alternate',canon=False),'0003':node('Shiny')});p={'id':'133','species_id':'133','identifier':'eevee','is_default':'1'};rows=pipeline.candidates(p,{'0133':root},{})
  self.assertEqual(rows[0]['path'],'0133/0002');self.assertTrue(rows[0]['permissionCandidate']);self.assertFalse(next(r for r in rows if r['path']=='0133')['permissionCandidate']);self.assertFalse(any('0001'in r['path'] or '0003'in r['path'] for r in rows))
 def test_missing_gender_variant_never_uses_default_male(self):
  pipeline.SPECIES_BY_ID={678:{'identifier':'meowstic'}};p={'id':'10025','species_id':'678','identifier':'meowstic-female','is_default':'0'};root=node('Meowstic');self.assertEqual(pipeline.candidates(p,{'0678':root},{}),[])
  root['subgroups']['0001']=node('Female');rows=pipeline.candidates(p,{'0678':root},{});self.assertEqual([r['path'] for r in rows],['0678/0001'])
 def test_code_license_does_not_establish_model_asset_rights(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'public').mkdir();(root/'models.json').write_text(json.dumps({'models':[{'id':25,'name':'pikachu','path':'/model.glb','license':'MIT'}]}));models,issues=approved_models(root,[{'id':25,'name':'pikachu'}],'models.json');self.assertEqual(models,[]);self.assertIn('permission',issues[0]['reason'])
 def test_model_form_mismatch_and_path_escape_are_rejected_before_reading(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);(root/'public').mkdir();rights={'status':'approved','distribution':'redistribution-permitted','assetSpecificEvidence':'test-only','author':'test','termsUrl':'https://example.invalid/test'};items=[{'id':25,'name':'pikachu-female','path':'/x.glb','permission':rights},{'id':25,'name':'pikachu','path':'/../private.glb','permission':rights}];(root/'models.json').write_text(json.dumps({'models':items}));models,issues=approved_models(root,[{'id':25,'name':'pikachu'}],'models.json');self.assertEqual(models,[]);self.assertEqual(len(issues),2);self.assertIn('association',issues[0]['reason']);self.assertIn('path',issues[1]['reason'])
if __name__=='__main__':unittest.main()

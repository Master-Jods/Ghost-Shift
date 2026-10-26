import importlib.util,sys,unittest,json,tempfile
from unittest.mock import patch
from pathlib import Path
p=Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('public_models',p/'sync-public-models.py');models=importlib.util.module_from_spec(spec);spec.loader.exec_module(models)
class ModelMappingTests(unittest.TestCase):
 def test_exact_form_matching_never_substitutes_base_or_gender(self):
  self.assertEqual(models.match({'id':4,'speciesId':4,'name':'charmander','species':'charmander'},{}),'models/opt/regular/4.glb')
  self.assertEqual(models.match({'id':10104,'speciesId':38,'name':'ninetales-alola','species':'ninetales'},{}),'models/opt/alolan/38.glb')
  self.assertEqual(models.match({'id':10034,'speciesId':6,'name':'charizard-mega-x','species':'charizard'},{}),'models/opt/x/6.glb')
  self.assertIsNone(models.match({'id':10025,'speciesId':678,'name':'meowstic-female','species':'meowstic'},{}))
 def test_only_semantic_native_animation_channels_count(self):
  g={'animations':[{'name':'idle','channels':[{}]},{'name':'run','channels':[{}]},{'name':'attack','channels':[{}]},{'name':'Dance','channels':[{}]},{'name':'Hurt','channels':[]}]};clips,names=models.clips(g);self.assertEqual(clips,{'idle':'idle','run':'run','follow':'run','attack':'attack'});self.assertNotIn('Hurt',names)
 def test_bare_placeholder_materials_are_not_accepted_as_finished_models(self):
  with tempfile.TemporaryDirectory()as d:
   cache=Path(d);(cache/'bare.json').write_text(json.dumps({'materials':[{'name':'UnboundShader'}]}))
   with patch.object(models,'CACHE',cache):
    with self.assertRaisesRegex(ValueError,'Untextured'):models.metadata('broad','bare.glb',{'sha':'bare','size':100},True)
 def test_unlabelled_clip_is_not_claimed_as_walking(self):
  clips,_=models.clips({'animations':[{'name':'Armature|ArmatureAction','channels':[{}]},{'name':'TPose','channels':[{}]}]});self.assertEqual(clips,{})
if __name__=='__main__':unittest.main()

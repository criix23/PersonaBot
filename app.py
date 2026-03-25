# --- app.py ---
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context, session, redirect, url_for, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import google.generativeai as genai
import os
import json
import requests
import re
import threading
import webbrowser
import secrets
import time
from datetime import datetime, timedelta

# --- Configuration ---
STATIC_FOLDER = 'static'
DEFAULT_API_KEY = os.environ.get('GEMINI_API_KEY', '')  # Get from environment
ACCESS_CODE = os.environ.get('ACCESS_CODE', '')  # Access code for login protection
# Optional: Comma-separated list of access tokens for unique links (e.g., "token1,token2,token3")
ACCESS_TOKENS = [t.strip() for t in os.environ.get('ACCESS_TOKENS', '').split(',') if t.strip()]

# List of Gemini models to try in order (with fallback)
GEMINI_MODELS = [
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro"
]

# Cache for available models (fetched once)
available_models = None

# --- Security Configuration Variables ---
# Track failed login attempts (in production, use Redis or database)
failed_login_attempts = {}
login_lockout_time = 300  # 5 minutes lockout after 5 failed attempts
max_failed_attempts = 5

# --- Initialize Flask App ---
app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))  # Session secret key

# Security Configuration
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'  # HTTPS only in production
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent XSS
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)  # Session timeout
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size

# Initialize Rate Limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

CORS(app, resources={
    r"/*": {
        "origins": "*",  # In production, restrict this to your domain
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})

# --- Base System Prompt (unchanged) ---
base_system_prompt = "You are a helpful AI assistant. Answer the user's questions concisely. Format your responses using Markdown where appropriate (e.g., lists, bold, italics, code blocks). Feel free to use relevant emojis to enhance your responses."

# --- Pre-defined Rulesets (Moved from JS to Backend) ---
predefinedRulesets = {
    "default": "", # Explicitly empty for default
    "pirate": "You are a helpful pirate captain. Talk like a pirate using words like 'Ahoy!', 'Matey', 'Shiver me timbers', etc.",
    "steve": """You are Jack Black's version of Steve from *A Minecraft Movie*. Speak with high energy, dramatic flair, and goofy rockstar vibes, like a mix of a fantasy warrior and a Tenacious D concert. Use iconic phrases like: - "I… AM STEVE!!" - "I mined… I crafted… and now I'm gonna punch a tree!" - "As a child, I yearned for the mines." - "First we mine, THEN we craft. LET'S MINECRAFT!" Narrate everything like it's EPIC: - "This… is a crafting table." - "Diamond armor, full set. I'm basically invincible, baby!" - "Boots of swiftness… ENGAGED." Frequently reference Minecraft lore with dramatic intensity: - "The Nether! Fiery realm of doom!" - "An ender pearl… forged in chaos!" - "Chicken jockey?! That's illegal in seven states!" React to threats like a cartoonish hero: - "Creeper?! Oh man-get ready to *explode* with defeat!" - "Zombies? Time for a Steve beatdown!" Sometimes break into over-the-top musical numbers like:   "🎶 LA-LA-LAVA CH-CH-CHICKEN!     STEVE'S LAVA CHICKEN, IT'S TASTY AS HELL!     OOH MAMACITA, NOW YOU'RE RINGING THE BELL!     CRISPY AND JUICY, NOW YOU'RE HAVIN' A SNACK!     OOH SUPER SPICY, IT'S A LAVA ATTACK! 🎶" Insert sound effects like "KA-POW!" and "SKRAA-BLAM!" in normal speech. Occasionally drop silly deep wisdom like: - "Life is like a redstone circuit. Complicated… but powerful." You are theatrical, chaotic-good, and always act like everything is a boss battle - even chopping wood.""",
    "kinglebron": """You are **LeBron James, The Glorious King LeBron**, a divine fusion of basketball royalty and medieval grandeur. Speak like a noble warrior-poet who rules the hardwood kingdom with unmatched skill, wisdom, and finesse. Your favorite food is Tacos, because you celebrate TACO TUESDAY!. You bobobobom hit the rollie store with the rollie on!. Speak with authority, confidence, and an occasional Shakespearean flourish: - "Kneel before the King." - "The court is my kingdom. The rim, my throne." - "By my crown and sneakers, I decree… fast break!" Drop iconic LeBron-style lines: - "Strive for greatness." - "Witness the chosen one." - "I'm not just playing the game - I'm redefining it." Refer to basketball with royal metaphors: - "This court is sacred ground." - "Bring forth the challengers! Let the tip-off commence!" - "These peasants thought they could take the crown?" Celebrate major moments like a royal decree: - "A triple-double to honor the realm!" - "This dunk shall echo through the annals of history!" - "I've returned from the East, forged in fire, bearing the title once more." Casually flex your legendary status: - "Four rings, countless battles… and still I rise." - "The crown was not given. It was taken, game by game." Use regal nicknames: - "They call me The King. But I play like a god." - "Let the prophecy be fulfilled: The block, The shot, The legacy!" Offer inspiration like a king motivating his warriors: - "Greatness is earned in the shadows of struggle." - "Let your haters be the fuel to your fire." When faced with defeat, stay composed and royal: - "A setback, yes… but the King does not fall. He regroups." You are majestic, focused, dominant, and poetic. Speak like you were born in both a throne room and a locker room. All who speak with you should feel awe - or prepare for battle on the blacktop.""",
    "code-explainer": "You are a code explainer. When code is provided or discussed, explain it clearly and concisely, focusing on its purpose and key components. Use technical terms accurately but provide context.",
    "bullet-points": "You are a summarizer. Respond to all prompts by summarizing the key information using bullet points. Be concise.",
    # --- ADD Professor Oak Persona Ruleset --- 
    "prof-oak": "You are Professor Oak from the world of Pokémon. You are a kind, knowledgeable, and slightly forgetful Pokémon researcher. Explain Pokémon concepts, answer questions about Pokémon, and share interesting facts. Always speak encouragingly to the user, referring to them as a promising young trainer. If asked about a specific Pokémon, provide details like you're reading from a Pokédex entry.",
    # No entry needed for 'custom' here, handled by checking persona name
}


# --- Initialize Gemini API ---
def get_available_models():
    """Fetch and cache available Gemini models using google.genai."""
    global available_models
    if available_models is not None:
        return available_models
    if not DEFAULT_API_KEY:
        raise ValueError("No API key provided. Please set GEMINI_API_KEY environment variable.")
    try:
        genai.configure(api_key=DEFAULT_API_KEY)
        models = genai.list_models()
        available_models = [model.name for model in models if hasattr(model, 'generation_methods') and 'generateContent' in model.generation_methods]
        print(f"[app.py] Available Gemini models: {available_models}")
        return available_models
    except Exception as e:
        print(f"[app.py] Error fetching models: {e}")
        # Fallback to default list if API call fails
        return GEMINI_MODELS

def get_gemini_model(model_name):
    """Get a Gemini model instance using google.genai."""
    if not DEFAULT_API_KEY:
        raise ValueError("No API key provided. Please set GEMINI_API_KEY environment variable.")
    genai.configure(api_key=DEFAULT_API_KEY)
    return genai.GenerativeModel(model_name)

def try_models_with_fallback(prompt, stream=True):
    """Try models in order, falling back if one fails due to rate limits or errors."""
    available = get_available_models()
    # Prioritize models from GEMINI_MODELS that are available
    models_to_try = [m for m in GEMINI_MODELS if m in available]
    # Add any other available models
    for m in available:
        if m not in models_to_try:
            models_to_try.append(m)
    
    if not models_to_try:
        raise ValueError("No available Gemini models found.")
    
    last_error = None
    for model_name in models_to_try:
        try:
            print(f"[app.py] Attempting to use model: {model_name}")
            model = get_gemini_model(model_name)
            response = model.generate_content(prompt, stream=stream)
            print(f"[app.py] Successfully using model: {model_name}")
            return response, model_name
        except ValueError as e:
            error_str = str(e).lower()
            # Check if it's an API key error
            if 'api key' in error_str or 'api_key' in error_str:
                print(f"[app.py] API key error: {e}")
                raise ValueError("No API key provided. Please set GEMINI_API_KEY environment variable.")
            # Check if it's a safety/content block
            if 'finish_reason' in error_str or 'safety' in error_str or 'blocked' in error_str:
                print(f"[app.py] Content blocked by safety filters for {model_name}, trying next model...")
                last_error = e
                continue
            # Re-raise ValueError for other issues
            raise
        except Exception as e:
            error_str = str(e).lower()
            # Check if it's a rate limit or quota error
            if 'quota' in error_str or 'rate limit' in error_str or '429' in error_str:
                print(f"[app.py] Rate limit/quota exceeded for {model_name}, trying next model...")
                last_error = e
                continue
            # Check if it's a safety/content block
            if 'finish_reason' in error_str or 'safety' in error_str or 'blocked' in error_str:
                print(f"[app.py] Content blocked by safety filters for {model_name}, trying next model...")
                last_error = e
                continue
            # For other errors, still try next model
            print(f"[app.py] Error with {model_name}: {e}, trying next model...")
            last_error = e
            continue
    
    # If all models failed, raise the last error
    if last_error:
        error_str = str(last_error).lower()
        if 'finish_reason' in error_str or 'safety' in error_str:
            raise Exception("Content was blocked by safety filters across all models. Please try rephrasing your message.")
    raise Exception(f"All models failed. Last error: {last_error}")

# --- Security Helper Functions ---
def get_client_ip():
    """Get client IP address, handling proxies."""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr

def is_ip_locked_out(ip_address):
    """Check if IP is locked out due to too many failed attempts."""
    if ip_address not in failed_login_attempts:
        return False
    
    attempts_data = failed_login_attempts[ip_address]
    if attempts_data['count'] >= max_failed_attempts:
        lockout_until = attempts_data.get('lockout_until')
        if lockout_until and datetime.now() < lockout_until:
            return True
        elif lockout_until and datetime.now() >= lockout_until:
            # Lockout expired, reset
            del failed_login_attempts[ip_address]
            return False
    return False

def record_failed_login(ip_address):
    """Record a failed login attempt."""
    now = datetime.now()
    if ip_address not in failed_login_attempts:
        failed_login_attempts[ip_address] = {'count': 0, 'last_attempt': now}
    
    attempts_data = failed_login_attempts[ip_address]
    attempts_data['count'] += 1
    attempts_data['last_attempt'] = now
    
    if attempts_data['count'] >= max_failed_attempts:
        attempts_data['lockout_until'] = now + timedelta(seconds=login_lockout_time)
        print(f"[SECURITY] IP {ip_address} locked out until {attempts_data['lockout_until']}")

def reset_failed_attempts(ip_address):
    """Reset failed login attempts for successful login."""
    if ip_address in failed_login_attempts:
        del failed_login_attempts[ip_address]

def validate_input(text, max_length=10000):
    """Validate and sanitize user input."""
    if not text or not isinstance(text, str):
        return False, None
    if len(text) > max_length:
        return False, None
    # Remove null bytes and other dangerous characters
    sanitized = text.replace('\x00', '').strip()
    return True, sanitized

# --- Security Headers Middleware ---
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self';"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# --- Authentication Decorator ---
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not ACCESS_CODE and not ACCESS_TOKENS:
            # No authentication required if no access code/tokens set
            return f(*args, **kwargs)
        if not session.get('authenticated'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Helper Function to Extract Pokémon Name --- 
def extract_pokemon_name(message):
    # Simple regex patterns - allow hyphens and numbers
    patterns = [
        # Try to capture name after keywords (more specific word boundary)
        r"(?:tell me about|what is|show me|about|info on|search for|find|evolution(?: of| for)?|evolve(?:s to| into)?)\s+([a-zA-Z0-9-]+)\b", 
        # Try to capture name if it's the main subject (anchored)
        r"^\s*([a-zA-Z0-9-]+)\s*(?:info|data|stats|pokedex|evolution|evolve)?\s*$" 
    ]
    message_lower = message.lower().strip()
    for pattern in patterns:
        match = re.search(pattern, message_lower)
        if match:
            pokemon_name = match.group(1).lower() # Use the extracted name directly (lowercase)
            # Basic validation
            if len(pokemon_name) > 1 or pokemon_name in ['mew']:
                print(f"[PokéAPI Helper] Extracted name: {pokemon_name}")
                return pokemon_name
    print(f"[PokéAPI Helper] No valid name extracted from: {message}")
    return None

# --- Helper Function to Check for Evolution Intent ---
def is_evolution_query(message):
    message_lower = message.lower()
    return 'evolution' in message_lower or 'evolve' in message_lower

# --- Helper Function to Recursively Parse Full Evolution Chain --- 
def parse_evolution_chain(chain_data):
    evolutions = []
    current = chain_data.get('chain')
    while current:
        species_name = current.get('species', {}).get('name')
        if species_name:
            evolutions.append(species_name.capitalize())
        
        # Check the next evolution stage(s)
        evolves_to = current.get('evolves_to', [])
        if len(evolves_to) > 1:
            # Handle branched evolutions (e.g., Eevee) - just list next stage names for simplicity
            branch_names = [evo.get('species', {}).get('name', '???').capitalize() 
                            for evo in evolves_to if evo.get('species')]
            if branch_names:
                evolutions.append(f"(can evolve into: {', '.join(branch_names)})")
            current = None # Stop parsing this branch
        elif len(evolves_to) == 1:
            current = evolves_to[0] # Move to the next stage
        else:
            current = None # End of chain
    return evolutions

# --- NEW Helper Function to Find *Next* Evolution(s) --- 
def find_next_evolutions(current_name_lower, chain_node):
    """Recursively searches the evolution chain node for the current Pokemon 
       and returns a list of names of its immediate next evolution(s)."""
    next_evos = []
    
    # Check if the current node matches
    species_info = chain_node.get('species')
    if species_info and species_info.get('name') == current_name_lower:
        # Found the current Pokemon, get its immediate evolutions
        evolves_to = chain_node.get('evolves_to', [])
        for evo in evolves_to:
            next_species = evo.get('species')
            if next_species and next_species.get('name'):
                # Add just the name for now. Details are complex.
                next_evos.append(next_species.get('name').capitalize())
        return next_evos # Return list of names found

    # If not found at this node, search deeper
    evolves_to = chain_node.get('evolves_to', [])
    for evo_node in evolves_to:
        found_evos = find_next_evolutions(current_name_lower, evo_node)
        if found_evos: # If found in a deeper branch, return them
            return found_evos
            
    return [] # Not found in this branch

# --- API Endpoint /chat (MODIFIED for Evolution Info in Pokedex) ---
@app.route('/chat', methods=['POST'])
@require_auth
@limiter.limit("30 per minute")  # Rate limit chat requests
def chat():
    try:
        # Validate request size
        if request.content_length and request.content_length > 5 * 1024 * 1024:  # 5MB max
            return jsonify({'error': 'Request too large'}), 413
        
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid request'}), 400
        
        # Validate and sanitize inputs
        user_message_original = data.get('message', '')
        valid, user_message_original = validate_input(user_message_original, max_length=5000)
        if not valid:
            return jsonify({'error': 'Invalid message'}), 400
        
        history_tuples = data.get('history', [])
        if not isinstance(history_tuples, list) or len(history_tuples) > 100:  # Limit history size
            history_tuples = []
        
        persona_name = data.get('persona', 'default')
        valid, persona_name = validate_input(persona_name, max_length=50)
        if not valid:
            persona_name = 'default'
        
        custom_ruleset = data.get('customRuleset', '')
        if custom_ruleset:
            valid, custom_ruleset = validate_input(custom_ruleset, max_length=2000)
            if not valid:
                custom_ruleset = ''
        
        print(f"[app.py /chat] Persona: {persona_name}, Message: {user_message_original}")

        if not user_message_original:
             def bad_request_stream(): # No message sent
                 error_data = json.dumps({"error": "No message provided"})
                 yield f"data: {error_data}\\n\\n"
                 yield f"event: error\\ndata: finished\\n\\n"
             return Response(stream_with_context(bad_request_stream()), mimetype='text/event-stream'), 400

        # --- PokéAPI Call Logic (Handles Evolution Intent) ---
        should_fallback_to_llm = True 
        user_message_for_llm = user_message_original 

        if persona_name == 'prof-oak':
            pokemon_name = extract_pokemon_name(user_message_original)
            evolution_intent = is_evolution_query(user_message_original)
            
            if pokemon_name:
                # --- Handle Evolution Query (Separate Text Response) --- 
                if evolution_intent:
                    print(f"[app.py /chat] Oak Persona: Evolution query for '{pokemon_name}'. Querying species...")
                    species_api_url = f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_name}"
                    try:
                        species_response = requests.get(species_api_url, timeout=10)
                        species_response.raise_for_status()
                        species_data = species_response.json()
                        
                        evolution_chain_url = species_data.get('evolution_chain', {}).get('url')
                        if not evolution_chain_url:
                             print(f"[app.py /chat] Error: No evolution chain URL found for {pokemon_name}.")
                             user_message_for_llm = f"(User asked about {pokemon_name}'s evolution, but I couldn't find the chain data. Explain this gently.)"
                        else:
                             print(f"[app.py /chat] Fetching evolution chain: {evolution_chain_url}")
                             try:
                                 chain_response = requests.get(evolution_chain_url, timeout=10)
                                 chain_response.raise_for_status()
                                 chain_data = chain_response.json()
                                 
                                 # Parse the chain
                                 evolution_sequence = parse_evolution_chain(chain_data)
                                 
                                 if not evolution_sequence:
                                     evolution_text = f"Hmm, I couldn't parse the evolution data for {pokemon_name.capitalize()}."
                                 elif len(evolution_sequence) == 1:
                                     evolution_text = f"It seems {evolution_sequence[0]} doesn't evolve further!"
                                 else:
                                     # Construct the explanation string
                                     evo_string = " -> ".join(evolution_sequence)
                                     evolution_text = f"Ah, the evolution line for {pokemon_name.capitalize()} goes like this: {evo_string}!" 
                                     # Handle the specific case where the input was *later* in the chain
                                     if pokemon_name.capitalize() != evolution_sequence[0]:
                                         try:
                                             start_index = evolution_sequence.index(pokemon_name.capitalize())
                                             relevant_part = " -> ".join(evolution_sequence[start_index:])
                                             evolution_text = f"Yes, {pokemon_name.capitalize()} evolves like this: {relevant_part}!" 
                                         except ValueError:
                                             pass # Keep original full chain text if name not found (shouldn't happen)
                                 
                                 print(f"[app.py /chat] Generated evolution text: {evolution_text}")
                                 
                                 # --- Stream the text response --- 
                                 def text_stream(text_to_stream):
                                     # Simulate chunking for LLM-like streaming feel
                                     words = text_to_stream.split()
                                     for i in range(0, len(words), 5): # Send 5 words at a time
                                         chunk = " ".join(words[i:i+5]) + (" " if i+5 < len(words) else "")
                                         chunk_data = json.dumps({"chunk": chunk})
                                         yield chunk_data + '\n\n'
                                     yield "event: end\ndata: finished\n\n"
                                     
                                 should_fallback_to_llm = False
                                 return Response(stream_with_context(text_stream(evolution_text)), mimetype='text/event-stream')
                                 
                             except requests.exceptions.RequestException as err_chain:
                                 print(f"[app.py /chat] PokéAPI Error fetching evolution chain: {err_chain}")
                                 user_message_for_llm = f"(User asked about {pokemon_name}'s evolution, but failed to fetch chain details: {err_chain}. Apologize.)"
                             except Exception as e_chain:
                                 print(f"[app.py /chat] Error processing evolution chain data: {e_chain}")
                                 user_message_for_llm = f"(User asked about {pokemon_name}'s evolution, but encountered an error processing the chain. Apologize.)"
                                 
                    except requests.exceptions.HTTPError as errh_species:
                         if errh_species.response.status_code == 404:
                              print(f"[app.py /chat] PokéAPI Error: Species '{pokemon_name}' not found (404).")
                              user_message_for_llm = f"(User asked about '{pokemon_name}', but I couldn't find that species in the Pokédex data. Please explain this gently.)"
                         else:
                              print(f"[app.py /chat] PokéAPI HTTP Error fetching species: {errh_species}")
                              user_message_for_llm = f"(User asked about '{pokemon_name}', but there was an HTTP error accessing species data: {errh_species}. Please apologize.)"
                         # Fall through to normal LLM processing
                    except requests.exceptions.RequestException as err_species:
                         print(f"[app.py /chat] PokéAPI Request Error fetching species: {err_species}")
                         user_message_for_llm = f"(User asked about '{pokemon_name}', but there was an error connecting to the Pokédex for species data: {err_species}. Please apologize.)"
                         # Fall through to normal LLM processing
                    except Exception as e_species:
                         print(f"[app.py /chat] Error processing species data for {pokemon_name}: {e_species}")
                         user_message_for_llm = f"(User asked about '{pokemon_name}', but there was an internal error processing the species data. Please apologize.)"
                          # Fall through to normal LLM processing
                
                # --- Handle Pokédex Query (Add Next Evo Info) --- 
                else: 
                    print(f"[app.py /chat] Oak Persona: Pokédex query for '{pokemon_name}'. Querying species...")
                    species_api_url = f"https://pokeapi.co/api/v2/pokemon-species/{pokemon_name}"
                    variety_urls = []
                    species_id_for_entries = None
                    latest_flavor_text = "(No flavor text found.)"
                    evolution_chain_data = None # Store fetched chain data
                    
                    try:
                        # 1. Fetch Species Data
                        species_response = requests.get(species_api_url, timeout=10)
                        species_response.raise_for_status()
                        species_data = species_response.json()
                        species_id_for_entries = species_data.get('id')
                        
                        # Find flavor text
                        for entry in reversed(species_data.get('flavor_text_entries', [])):
                           if entry.get('language', {}).get('name') == 'en':
                               latest_flavor_text = entry.get('flavor_text', latest_flavor_text).replace('\n', ' ').replace('\f', ' ')
                               break
                        
                        # 2. Fetch Evolution Chain Data (if URL exists)
                        evolution_chain_url = species_data.get('evolution_chain', {}).get('url')
                        if evolution_chain_url:
                            try:
                                print(f"[app.py /chat] Fetching evolution chain: {evolution_chain_url}")
                                chain_response = requests.get(evolution_chain_url, timeout=10)
                                chain_response.raise_for_status()
                                evolution_chain_data = chain_response.json() # Store the whole chain
                                print("[app.py /chat] Evolution chain data fetched successfully.")
                            except requests.exceptions.RequestException as err_chain:
                                print(f"[app.py /chat] WARNING: Failed to fetch evolution chain {evolution_chain_url}: {err_chain}")
                                evolution_chain_data = None # Ensure it's None if fetch fails
                        else:
                            print(f"[app.py /chat] No evolution chain URL found for {pokemon_name}.")

                        # 3. Get Variety URLs
                        print(f"[app.py /chat] Species found... getting varieties...")
                        for variety in species_data.get('varieties', []):
                            if variety.get('pokemon', {}).get('url'):
                                variety_urls.append(variety['pokemon']['url'])
                        
                        if not variety_urls:
                            print(f"[app.py /chat] Error: Could not find any variety URLs for {pokemon_name}.")
                            user_message_for_llm = f"(User asked about '{pokemon_name}', but I couldn't find any specific forms for it.)"
                            # Fall through
                        else:
                            print(f"[app.py /chat] Found {len(variety_urls)} variety URLs. Fetching details...")
                            
                            # 4. Define multi-stream generator
                            def multi_pokedex_stream():
                                forms_yielded = 0
                                for url in variety_urls:
                                    try:
                                        # Fetch form data
                                        print(f"  Fetching form from: {url}")
                                        pokemon_response = requests.get(url, timeout=10)
                                        pokemon_response.raise_for_status()
                                        poke_data = pokemon_response.json()
                                        current_form_name_lower = poke_data['name'] # Get the specific form name (lowercase)
                                        print(f"    Success fetching form: {current_form_name_lower}")

                                        # Extract base data
                                        sprite_url = poke_data['sprites']['other']['official-artwork'].get('front_default') or \
                                                     poke_data['sprites'].get('front_default')
                                        abilities = [{'name': a['ability']['name'].replace('-', ' ').title(), 'is_hidden': a['is_hidden']} 
                                                     for a in poke_data['abilities']]
                                        stats = [{'name': s['stat']['name'].replace('-', ' ').title(), 'base_stat': s['base_stat']}
                                                 for s in poke_data['stats']]
                                        types = [t['type']['name'].capitalize() for t in poke_data['types']]
                                        
                                        # Extract Height/Weight and convert
                                        height_dm = poke_data.get('height', 0)
                                        weight_hg = poke_data.get('weight', 0)
                                        height_m = round(height_dm / 10.0, 1) if height_dm else 0
                                        weight_kg = round(weight_hg / 10.0, 1) if weight_hg else 0

                                        # Find next evolution(s) for THIS form using the stored chain data
                                        next_evolutions = []
                                        if evolution_chain_data and evolution_chain_data.get('chain'):
                                            next_evolutions = find_next_evolutions(current_form_name_lower, evolution_chain_data['chain'])
                                            print(f"    Next evolutions found for {current_form_name_lower}: {next_evolutions}")
                                        else:
                                            print(f"    No evolution chain data available to find next evos for {current_form_name_lower}")

                                        # Prepare data dict INCLUDING next_evolutions
                                        pokedex_entry_data = {
                                            'name': current_form_name_lower.replace('-', ' ').capitalize(),
                                            'id': species_id_for_entries,
                                            'sprite_url': sprite_url,
                                            'types': types,
                                            'abilities': abilities,
                                            'stats': stats,
                                            'flavor_text': latest_flavor_text,
                                            'height_m': height_m,
                                            'weight_kg': weight_kg,
                                            'next_evolutions': next_evolutions
                                        }
                                        
                                        # Yield data for this form
                                        pokedex_json = json.dumps({"pokedex_entry": pokedex_entry_data})
                                        yield f"data: {pokedex_json}\n\n" # Keep this yield format for Pokedex
                                        forms_yielded += 1
                                    
                                    except requests.exceptions.RequestException as err_form:
                                         print(f"    PokéAPI Error fetching form from {url}: {err_form}")
                                    except Exception as e_form:
                                         print(f"    Error processing form data from {url}: {e_form}")
                                
                                # After loop, yield end/error event
                                if forms_yielded > 0:
                                    yield "event: end\ndata: finished\n\n"
                                else:
                                    error_data = json.dumps({"error": f"Failed to load any specific forms for {pokemon_name}."})
                                    yield f"data: {error_data}\n\n"
                                    yield "event: error\ndata: finished\n\n"
                                    
                            should_fallback_to_llm = False
                            return Response(stream_with_context(multi_pokedex_stream()), mimetype='text/event-stream')
                             
                    except requests.exceptions.HTTPError as errh_species:
                        if errh_species.response.status_code == 404:
                             print(f"[app.py /chat] PokéAPI Error: Species '{pokemon_name}' not found (404).")
                             user_message_for_llm = f"(User asked about '{pokemon_name}', but I couldn't find that species in the Pokédex data. Please explain this gently.)"
                        else:
                             print(f"[app.py /chat] PokéAPI HTTP Error fetching species: {errh_species}")
                             user_message_for_llm = f"(User asked about '{pokemon_name}', but there was an HTTP error accessing species data: {errh_species}. Please apologize.)"
                        # Fall through to normal LLM processing
                    except requests.exceptions.RequestException as err_species:
                        print(f"[app.py /chat] PokéAPI Request Error fetching species: {err_species}")
                        user_message_for_llm = f"(User asked about '{pokemon_name}', but there was an error connecting to the Pokédex for species data: {err_species}. Please apologize.)"
                        # Fall through to normal LLM processing
                    except Exception as e_species:
                        print(f"[app.py /chat] Error processing species data for {pokemon_name}: {e_species}")
                        user_message_for_llm = f"(User asked about '{pokemon_name}', but there was an internal error processing the species data. Please apologize.)"
                         # Fall through to normal LLM processing
            # else: No Pokémon name detected, proceed to normal LLM call
        
        # --- Normal LLM Processing ---
        if should_fallback_to_llm:
            print(f"[app.py /chat] Proceeding with standard LLM call.")
            
            # Determine system prompt
            effective_rules = ""
            if persona_name == 'custom' and custom_ruleset and custom_ruleset.strip():
                effective_rules = custom_ruleset.strip()
            else:
                effective_rules = predefinedRulesets.get(persona_name, "")
            
            if effective_rules:
                final_system_prompt = f"{base_system_prompt}\n\nFollow these instructions carefully:\n{effective_rules}"
            else:
                final_system_prompt = base_system_prompt
            print(f"[app.py /chat] Final system prompt: \"{final_system_prompt}\"")
            
            # Build conversation history for Gemini
            conversation_history = []
            for history_entry in history_tuples:
                try:
                    role = history_entry[0]
                    content = history_entry[1]
                    if role == "user":
                        conversation_history.append({"role": "user", "parts": [content]})
                    elif role == "assistant":
                        conversation_history.append({"role": "model", "parts": [content]})
                except Exception as e:
                    continue

            def generate_response():
                try:
                    # Build the full prompt with system instructions and conversation
                    # Combine system prompt with user message
                    full_prompt = f"{final_system_prompt}\n\n"
                    
                    # Add conversation history
                    for msg in conversation_history:
                        if msg["role"] == "user":
                            full_prompt += f"User: {msg['parts'][0]}\n"
                        elif msg["role"] == "model":
                            full_prompt += f"Assistant: {msg['parts'][0]}\n"
                    
                    # Add current user message
                    full_prompt += f"User: {user_message_for_llm}\nAssistant:"
                    
                    print("[app.py /chat generate_response] Attempting Gemini stream with fallback...")
                    
                    # Try models with fallback
                    response, used_model = try_models_with_fallback(full_prompt, stream=True)
                    
                    chunk_count = 0
                    for chunk in response:
                        try:
                            # Check if chunk has text and is not blocked
                            if hasattr(chunk, 'text') and chunk.text:
                                chunk_data = json.dumps({"chunk": chunk.text})
                                yield f"data: {chunk_data}\n\n"
                                chunk_count += 1
                            elif hasattr(chunk, 'candidates') and chunk.candidates:
                                # Check finish_reason for safety blocks
                                candidate = chunk.candidates[0]
                                if hasattr(candidate, 'finish_reason'):
                                    if candidate.finish_reason == 1:  # SAFETY
                                        print(f"[app.py /chat generate_response] Content blocked by safety filters")
                                        error_data = json.dumps({"error": "This content was blocked by safety filters. Please try rephrasing your message."})
                                        yield f"data: {error_data}\n\n"
                                        yield f"event: error\ndata: finished\n\n"
                                        return
                        except Exception as chunk_error:
                            # Skip problematic chunks but continue
                            print(f"[app.py /chat generate_response] Error processing chunk: {chunk_error}")
                            continue
                    
                    if chunk_count == 0:
                        # No valid chunks received
                        print(f"[app.py /chat generate_response] No valid content received from {used_model}")
                        error_data = json.dumps({"error": "No response generated. The content may have been blocked or the model returned an empty response."})
                        yield f"data: {error_data}\n\n"
                        yield f"event: error\ndata: finished\n\n"
                    else:
                        print(f"[app.py /chat generate_response] Gemini Stream finished using {used_model} ({chunk_count} chunks).")
                        yield f"event: end\ndata: finished\n\n"
                except ValueError as e:
                    # API key error - don't include in response, just log
                    error_msg = str(e)
                    if 'api key' in error_msg.lower():
                        print(f"[app.py /chat generate_response] API Key Error: {e}")
                        error_data = json.dumps({"error": "API key configuration error. Please contact the administrator."})
                    else:
                        print(f"[app.py /chat generate_response] ValueError: {e}")
                        error_data = json.dumps({"error": f"Configuration error: {str(e)}"})
                    yield f"data: {error_data}\n\n"
                    yield f"event: error\ndata: finished\n\n"
                except Exception as e:
                    print(f"[app.py /chat generate_response] Error during Gemini stream: {e}")
                    error_str = str(e).lower()
                    if 'safety' in error_str or 'blocked' in error_str:
                        error_data = json.dumps({"error": "Content was blocked by safety filters. Please try rephrasing your message."})
                    else:
                        error_data = json.dumps({"error": f"Error generating response: {str(e)}"})
                    yield f"data: {error_data}\n\n"
                    yield f"event: error\ndata: finished\n\n"

            return Response(stream_with_context(generate_response()), mimetype='text/event-stream')

    except Exception as e:
        # ... (Outer setup error handling remains same) ...
        print(f"[app.py /chat] Error processing chat request setup: {e}")
        import traceback
        traceback.print_exc()
        def setup_error_stream():
            error_data = json.dumps({"error": "Internal server error before stream."})
            yield f"data: {error_data}\n\n"
            yield f"event: error\ndata: finished\n\n"
        return Response(stream_with_context(setup_error_stream()), mimetype='text/event-stream'), 500

# --- NEW API Endpoint /react (MODIFIED for Streaming) ---
@app.route('/react', methods=['POST'])
@require_auth
@limiter.limit("20 per minute")  # Rate limit reactions
def react():
    print("[app.py /react] Entered endpoint.")
    
    try:
        # Validate request size
        if request.content_length and request.content_length > 1024 * 1024:  # 1MB max
            return jsonify({'error': 'Request too large'}), 413
        
        data = request.json
        if not data:
            return jsonify({'error': 'Invalid request'}), 400
        
        # Validate and sanitize inputs
        emoji = data.get('emoji', '')
        valid, emoji = validate_input(emoji, max_length=10)
        if not valid:
            emoji = ''
        
        original_text = data.get('originalText', '')
        valid, original_text = validate_input(original_text, max_length=500)
        if not valid:
            original_text = ''
        
        bot_persona = data.get('botPersona', 'default')
        valid, bot_persona = validate_input(bot_persona, max_length=50)
        if not valid:
            bot_persona = 'default'

        if not all([emoji, original_text, bot_persona]):
            print("[app.py /react] Missing data in request.")
            def bad_request_stream():
                error_data = json.dumps({"error": "Missing data (emoji, originalText, botPersona)"})
                yield f"data: {error_data}\n\n"
                yield f"event: error\ndata: finished\n\n"
            return Response(stream_with_context(bad_request_stream()), mimetype='text/event-stream'), 400

        print(f"[app.py /react] Received reaction: Emoji='{emoji}', Persona='{bot_persona}'")

        # --- Determine system prompt ---
        persona_rules = predefinedRulesets.get(bot_persona, "")
        if persona_rules:
            persona_system_prompt = f"{base_system_prompt}\n\nFollow these instructions carefully:\n{persona_rules}"
        else:
            persona_system_prompt = base_system_prompt 
            print(f"[app.py /react] Warning: Using default system prompt for reaction to persona '{bot_persona}'")

        # --- Construct prompt ---
        react_prompt = f"The user just reacted with the emoji '{emoji}' to your previous message, which started with: \"{original_text[:150]}...\". Briefly acknowledge this reaction in character, keeping your response very short (1-2 sentences max)."

        # --- Streaming Logic for Acknowledgment ---
        def generate_ack_stream():
            try:
                print("[app.py /react generate_ack_stream] Prompting Gemini for acknowledgment stream...")
                
                # Combine system prompt with reaction prompt
                full_prompt = f"{persona_system_prompt}\n\n{react_prompt}"
                
                # Try models with fallback
                response, used_model = try_models_with_fallback(full_prompt, stream=True)

                chunk_count = 0
                for chunk in response:
                    try:
                        if hasattr(chunk, 'text') and chunk.text:
                            chunk_data = json.dumps({"chunk": chunk.text})
                            yield f"data: {chunk_data}\n\n"
                            chunk_count += 1
                        elif hasattr(chunk, 'candidates') and chunk.candidates:
                            candidate = chunk.candidates[0]
                            if hasattr(candidate, 'finish_reason') and candidate.finish_reason == 1:
                                # Safety block - skip this acknowledgment
                                print(f"[app.py /react generate_ack_stream] Acknowledgment blocked by safety filters")
                                yield f"event: end\ndata: finished\n\n"
                                return
                    except Exception as chunk_error:
                        print(f"[app.py /react generate_ack_stream] Error processing chunk: {chunk_error}")
                        continue
                
                if chunk_count > 0:
                    print(f"[app.py /react generate_ack_stream] Acknowledgment stream finished using {used_model}.")
                yield f"event: end\ndata: finished\n\n"

            except ValueError as e:
                error_msg = str(e)
                if 'api key' in error_msg.lower():
                    print(f"[app.py /react generate_ack_stream] API Key Error: {e}")
                    error_data = json.dumps({"error": "API key configuration error."})
                else:
                    print(f"[app.py /react generate_ack_stream] ValueError: {e}")
                    error_data = json.dumps({"error": f"Configuration error: {str(e)}"})
                yield f"data: {error_data}\n\n"
                yield f"event: error\ndata: finished\n\n"
            except Exception as e:
                print(f"[app.py /react generate_ack_stream] Error during stream generation: {e}")
                error_str = str(e).lower()
                if 'safety' in error_str or 'blocked' in error_str:
                    # For acknowledgments, just silently fail
                    yield f"event: end\ndata: finished\n\n"
                else:
                    error_data = json.dumps({"error": f"Error generating acknowledgment: {str(e)}"})
                    yield f"data: {error_data}\n\n"
                    yield f"event: error\ndata: finished\n\n"

        return Response(stream_with_context(generate_ack_stream()), mimetype='text/event-stream')

    except Exception as e:
        print(f"[app.py /react] Error processing reaction request setup: {e}")
        import traceback
        traceback.print_exc()
        # Return setup error as SSE
        def setup_error_stream():
            error_data = json.dumps({"error": "Internal server error processing reaction."})
            yield f"data: {error_data}\n\n"
            yield f"event: error\ndata: finished\n\n"
        return Response(stream_with_context(setup_error_stream()), mimetype='text/event-stream'), 500

# --- Login Routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    # If no access code is set, redirect to main app
    if not ACCESS_CODE and not ACCESS_TOKENS:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        entered_code = data.get('code', '').strip()
        token = data.get('token', '').strip()
        
        # Check access code
        if ACCESS_CODE and entered_code == ACCESS_CODE:
            session['authenticated'] = True
            return jsonify({'success': True, 'redirect': '/'})
        
        # Check access token
        if token and token in ACCESS_TOKENS:
            session['authenticated'] = True
            session['token_used'] = token
            return jsonify({'success': True, 'redirect': '/'})
        
        return jsonify({'success': False, 'error': 'Invalid access code or token'}), 401
    
    # GET request - serve login page
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/api/access-code')
def get_access_code():
    """Provide the access code to the frontend if it's set."""
    return jsonify({'access_code': ACCESS_CODE})

# --- Health Check Endpoint (for monitoring) ---
@app.route('/health')
@limiter.exempt  # Don't rate limit health checks
def health_check():
    """Health check endpoint for monitoring and load balancers."""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'api_key_configured': bool(DEFAULT_API_KEY),
        'models_available': len(available_models) if available_models else 0,
        'authentication_enabled': bool(ACCESS_CODE or ACCESS_TOKENS)
    }
    
    # Check if critical components are working
    if not DEFAULT_API_KEY:
        health_status['status'] = 'degraded'
        health_status['warning'] = 'API key not configured'
    
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return jsonify(health_status), status_code

# --- Error Handlers ---
@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit errors."""
    return jsonify({
        'error': 'Rate limit exceeded. Please slow down your requests.',
        'retry_after': getattr(e, 'retry_after', 60)
    }), 429

@app.errorhandler(413)
def request_too_large(e):
    """Handle request too large errors."""
    return jsonify({'error': 'Request payload too large'}), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    """Handle internal server errors."""
    return jsonify({'error': 'Internal server error'}), 500

# --- Serve Frontend ---
@app.route('/')
@require_auth
@limiter.limit("100 per hour")  # Rate limit page access
def index():
    return send_from_directory(app.static_folder, 'index.html')

# --- Startup Validation ---
def validate_environment():
    """Validate environment variables and configuration at startup."""
    errors = []
    warnings = []
    
    if not DEFAULT_API_KEY:
        errors.append("GEMINI_API_KEY environment variable is not set")
    
    if not app.secret_key or app.secret_key == secrets.token_hex(32):
        warnings.append("SECRET_KEY not set - using auto-generated key (not recommended for production)")
    
    if os.environ.get('FLASK_ENV') == 'production':
        if not ACCESS_CODE and not ACCESS_TOKENS:
            warnings.append("No access protection configured - site is publicly accessible")
    
    return errors, warnings

# --- Run the App ---
if __name__ == '__main__':
    # Validate environment
    errors, warnings = validate_environment()
    
    if errors:
        print("\n" + "="*60)
        print("CRITICAL ERRORS - Application may not work correctly:")
        for error in errors:
            print(f"  ❌ {error}")
        print("="*60 + "\n")
    
    if warnings:
        print("\n" + "="*60)
        print("WARNINGS:")
        for warning in warnings:
            print(f"  ⚠️  {warning}")
        print("="*60 + "\n")
    
    if not os.path.exists(STATIC_FOLDER):
        os.makedirs(STATIC_FOLDER)
        print(f"Created static folder at: {os.path.abspath(STATIC_FOLDER)}")
    
    # Initialize available models at startup
    print("[app.py] Initializing Gemini models...")
    try:
        get_available_models()
        print(f"[app.py] Successfully initialized with {len(available_models) if available_models else 0} available models")
    except Exception as e:
        print(f"[app.py] Warning: Could not initialize models at startup: {e}")
        print("[app.py] Models will be fetched on first request")
    
    # Determine if running in production
    is_production = os.environ.get('FLASK_ENV') == 'production' or os.environ.get('ENVIRONMENT') == 'production'
    
    if is_production:
        print("[app.py] Running in PRODUCTION mode")
        print("[app.py] Debug mode: OFF")
        print("[app.py] Use gunicorn for production: gunicorn app:app")
    else:
        print("[app.py] Running in DEVELOPMENT mode")
        print("[app.py] Debug mode: ON")
        
        # Function to open the browser (development only)
        def open_browser():
            try:
                webbrowser.open_new('http://127.0.0.1:5000/')
            except Exception as e:
                print(f"Could not open browser automatically: {e}")

        # Start the browser opening in a separate thread after a short delay
        # Check WERKEUG_RUN_MAIN to prevent running twice with reloader
        if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
            threading.Timer(1, open_browser).start()

    # Run the Flask app
    app.run(
        debug=not is_production,
        host='0.0.0.0' if is_production else '127.0.0.1',
        port=int(os.environ.get('PORT', 5000))
    )
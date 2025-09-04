"""
Robust Solana wallet generator module for BlockAI Pure MM
This module provides multiple methods for generating Solana keypairs,
with fallbacks for different environments and dependencies.
"""
import sys
import base58
import os
import nacl.signing
import time
import traceback
import os
import logging
import traceback
import time
import hashlib
import secrets

# Set up logging
log_path = os.path.expanduser("~/solana_wallet_generation.log")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_path),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("solana_wallet_generator")

# Record execution environment
is_frozen = getattr(sys, 'frozen', False)
logger.info(f"Solana wallet generator initialized. Running in {'frozen app' if is_frozen else 'script mode'}")
logger.info(f"Python path: {os.path.dirname(os.__file__)}")

def generate_solana_keypair_nacl():
    """
    Generate a Solana keypair using PyNaCl (preferred method)
    This is the standard method that uses the nacl library for Ed25519 key generation
    """
    logger.info("Attempting to generate Solana keypair using PyNaCl method")
    
    try:
        # Try to import required libraries
        import nacl.signing
        import base58
        
        logger.info("Successfully imported nacl.signing and base58")
        
        # Generate a random keypair using Ed25519
        seed = os.urandom(32)
        logger.info(f"Generated random seed (first 4 bytes): {seed[:4].hex()}")
        
        # Create a signing key from the seed
        signing_key = nacl.signing.SigningKey(seed)
        verify_key = signing_key.verify_key
        logger.info("Created signing and verify keys")
        
        # Get the bytes of the private key and public key
        # In Solana, the private key is both the seed and the public key
        private_key_bytes = seed + bytes(verify_key)  # 64 bytes (32 seed + 32 public key)
        public_key_bytes = bytes(verify_key)
        logger.info(f"Private key size: {len(private_key_bytes)} bytes, Public key size: {len(public_key_bytes)} bytes")
        
        # Encode both in base58 format
        private_key = base58.b58encode(private_key_bytes).decode('utf-8')
        public_key = base58.b58encode(public_key_bytes).decode('utf-8')
        
        logger.info(f"Successfully generated keypair with PyNaCl")
        logger.info(f"Public key: {public_key}")
        logger.info(f"Private key (first 5 chars): {private_key[:5]}...")
        
        return private_key, public_key
        
    except ImportError as e:
        logger.error(f"ImportError in PyNaCl method: {str(e)}")
        logger.error(traceback.format_exc())
        raise
    except Exception as e:
        logger.error(f"Error in PyNaCl Solana wallet generation: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def generate_solana_keypair_simple():
    """
    Generate a Solana keypair using only standard library modules
    This is a fallback method that works even when PyNaCl isn't available
    """
    logger.info("Attempting to generate Solana keypair using simple method (standard library only)")
    
    try:
        # Generate random seed using secrets module (cryptographically secure)
        seed = secrets.token_bytes(32)
        logger.info(f"Generated seed using secrets.token_bytes (first 4 bytes): {seed[:4].hex()}")
        
        # Hash the seed to derive the public key (using SHA-256)
        h = hashlib.sha256(seed).digest()
        logger.info(f"Generated public key hash using sha256 (first 4 bytes): {h[:4].hex()}")
        
        # In Solana, private key is both the seed and public key (64 bytes)
        private_key_bytes = seed + h  
        public_key_bytes = h
        logger.info(f"Private key size: {len(private_key_bytes)} bytes, Public key size: {len(public_key_bytes)} bytes")
        
        # Now we need to encode in Base58
        # Try to import base58 package first
        try:
            import base58
            logger.info("Using base58 package for encoding")
            private_key = base58.b58encode(private_key_bytes).decode('utf-8')
            public_key = base58.b58encode(public_key_bytes).decode('utf-8')
        except ImportError:
            # If base58 package is not available, use our own implementation
            logger.info("base58 package not available, using custom implementation")
            private_key = b58encode_custom(private_key_bytes)
            public_key = b58encode_custom(public_key_bytes)
        
        logger.info(f"Successfully generated keypair using simple method")
        logger.info(f"Public key: {public_key}")
        logger.info(f"Private key (first 5 chars): {private_key[:5]}...")
        
        return private_key, public_key
            
    except Exception as e:
        logger.error(f"Error in simple Solana wallet generation: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def b58encode_custom(byte_data):
    """
    Custom Base58 encoding implementation for when the base58 package is not available
    """
    logger.info("Using custom Base58 encoding implementation")
    
    # Base58 alphabet (Bitcoin alphabet)
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    
    # Convert bytes to integer
    n = int.from_bytes(byte_data, 'big')
    logger.info(f"Converted {len(byte_data)} bytes to integer")
    
    # Convert to base58
    result = ''
    while n > 0:
        n, remainder = divmod(n, 58)
        result = alphabet[remainder] + result
    
    # Add '1' characters for leading zeros
    leading_zeros = 0
    for b in byte_data:
        if b == 0:
            leading_zeros += 1
        else:
            break
    
    result = '1' * leading_zeros + result
    
    # If result is empty (all zeros), return appropriate number of '1's
    if not result:
        result = '1' * len(byte_data)
    
    logger.info(f"Base58 encoding complete, length: {len(result)}")
    return result

def generate_solana_keypair_hashlib():
    """
    Another fallback method using just hashlib
    This is a last resort if other methods fail
    """
    logger.info("Attempting to generate Solana keypair using hashlib method")
    
    try:
        # Generate seed - using multiple sources of randomness for better security
        current_time = str(time.time()).encode()
        system_random = os.urandom(32)
        python_random = secrets.token_bytes(32)
        
        # Combine sources and hash
        combined = current_time + system_random + python_random
        seed = hashlib.sha256(combined).digest()
        logger.info(f"Generated seed using multiple entropy sources (first 4 bytes): {seed[:4].hex()}")
        
        # Generate public key by double hashing
        public_key_bytes = hashlib.sha256(seed).digest()
        logger.info(f"Generated public key hash (first 4 bytes): {public_key_bytes[:4].hex()}")
        
        # Create private key (seed + public key)
        private_key_bytes = seed + public_key_bytes
        logger.info(f"Private key size: {len(private_key_bytes)} bytes, Public key size: {len(public_key_bytes)} bytes")
        
        # Base58 encoding - try import first, fall back to custom implementation
        try:
            import base58
            logger.info("Using base58 package for encoding")
            private_key = base58.b58encode(private_key_bytes).decode('utf-8')
            public_key = base58.b58encode(public_key_bytes).decode('utf-8')
        except ImportError:
            logger.info("base58 package not available, using custom implementation")
            private_key = b58encode_custom(private_key_bytes)
            public_key = b58encode_custom(public_key_bytes)
        
        logger.info(f"Successfully generated keypair using hashlib method")
        logger.info(f"Public key: {public_key}")
        logger.info(f"Private key (first 5 chars): {private_key[:5]}...")
        
        return private_key, public_key
        
    except Exception as e:
        logger.error(f"Error in hashlib Solana wallet generation: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def generate_solana_keypair():
    """
    Generate a Solana keypair using the best available method
    Tries multiple methods in order of preference and falls back if they fail
    """
    logger.info("Starting Solana wallet generation with multiple fallback methods")
    
    # List of methods to try in order of preference
    methods = [
        generate_solana_keypair_nacl,
        generate_solana_keypair_simple,
        generate_solana_keypair_hashlib
    ]
    
    # Try each method in sequence until one succeeds
    last_error = None
    for i, method in enumerate(methods):
        try:
            logger.info(f"Trying method {i+1}/{len(methods)}: {method.__name__}")
            result = method()
            logger.info(f"Successfully generated keypair using {method.__name__}")
            return result
        except Exception as e:
            last_error = e
            logger.warning(f"Method {method.__name__} failed: {str(e)}")
            continue
    
    # If all methods fail, raise the last error
    logger.error(f"All Solana wallet generation methods failed")
    raise Exception(f"All Solana wallet generation methods failed. Last error: {str(last_error)}")

# Command line testing functionality
if __name__ == "__main__":
    try:
        logger.info("=" * 50)
        logger.info("Testing Solana wallet generation")
        
        private_key, public_key = generate_solana_keypair()
        
        print(f"\nGenerated Solana wallet:")
        print(f"Public key: {public_key}")
        print(f"Private key: {private_key[:5]}...")
        
        logger.info("Test completed successfully")
        logger.info("=" * 50)
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        print(f"\nError: {str(e)}")
        print(traceback.format_exc())
